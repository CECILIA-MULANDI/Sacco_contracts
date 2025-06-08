// SPDX-License-Identifier: MIT
pragma solidity ^0.8.9;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/Pausable.sol";
import "./BlockCoopTokens.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/IERC20Metadata.sol";

contract LoanManager is Ownable, ReentrancyGuard, Pausable {
    using SafeERC20 for IERC20;

    // Constants
    uint256 public constant MAX_LOAN_DURATION = 365 days;
    uint256 public constant MIN_LOAN_DURATION = 7 days;
    uint256 public constant BASE_LTV = 8000; // 70% LTV
    uint256 public constant MAX_INTEREST_RATE = 5000; // 50%
    uint256 public constant SECONDS_PER_YEAR = 31536000;
    uint256 public constant BASIS_POINTS = 10000;

    // Liquidity provider incentives
    // uint256 public constant LP_REWARD_RATE = 300; // 3% annual yield for LPs
    uint256 public constant PROTOCOL_FEE = 100; // 1% protocol fee

    // Error messages
    string constant ERR_ZERO_ADDRESS = "Zero address not allowed";
    string constant ERR_UNAUTHORIZED = "Unauthorized access";
    string constant ERR_INVALID_AMOUNT = "Invalid amount";
    string constant ERR_INSUFFICIENT_LIQUIDITY = "Insufficient pool liquidity";
    string constant ERR_LOAN_NOT_ACTIVE = "Loan not active";
    struct LoanRequest {
        address borrower;
        address loanToken;
        uint256 loanAmount;
        address[] collateralTokens;
        uint256[] collateralAmounts;
        uint256 duration;
        bool approved;
        bool processed;
        uint256 timestamp;
    }
    struct Loan {
        address borrower;
        address loanToken;
        uint256 loanAmount;
        address[] collateralTokens;
        uint256[] collateralAmounts;
        uint256 interestRate;
        uint256 startTime;
        uint256 duration;
        bool isActive;
        uint256 totalRepaid;
        uint256 id;
    }
    struct LiquidityPool {
        uint256 totalLiquidity;
        uint256 availableLiquidity;
        uint256 totalBorrowed;
        uint256 totalLPShares;
        uint256 accumulatedFees;
        uint256 lastUpdateTime;
        bool isActive;
    }
    struct LPPosition {
        uint256 shares; // LP shares owned
        uint256 depositTime; // When position was created
        uint256 lastClaimTime; // Last reward claim time
    }
    BlockCoopTokens public saccoContract;
    uint256 public baseLoanInterestRate = 500; // 5%
    uint256 public loanCount = 0;
    uint256 public nextRequestId;
    mapping(uint256 => Loan) public loans;
    mapping(uint256 => LoanRequest) public loanRequests;
    mapping(address => uint256[]) public userLoans;
    mapping(address => uint256[]) public userLoanRequests;
    mapping(address => LiquidityPool) public liquidityPools;
    mapping(address => mapping(address => LPPosition)) public lpPositions; // token => user => position
    mapping(address => bool) public supportedTokens;
    mapping(address => address[]) public userLPTokens; // Track user's LP positions

    address[] public supportedTokenList;
    uint256[] private pendingRequestIds;

    event LoanRequested(
        uint256 indexed requestId,
        address indexed borrower,
        address indexed loanToken,
        uint256 loanAmount
    );
    event LoanApproved(uint256 indexed requestId, uint256 indexed loanId);
    event LoanRejected(uint256 indexed requestId, address indexed borrower);
    event LoanRepaid(uint256 indexed loanId, uint256 amount, uint256 interest);
    event CollateralReturned(uint256 indexed loanId, address indexed borrower);
    event LoanLiquidated(
        uint256 indexed loanId,
        address indexed liquidator,
        uint256 debtRecovered,
        uint256 collateralValue
    );
    event LiquidityAdded(
        address indexed provider,
        address indexed token,
        uint256 amount,
        uint256 shares
    );
    event LiquidityRemoved(
        address indexed provider,
        address indexed token,
        uint256 amount,
        uint256 shares
    );
    event RewardsClaimed(
        address indexed provider,
        address indexed token,
        uint256 amount
    );
    event PoolCreated(address indexed token);
    event PoolStatusChanged(address indexed token, bool isActive);

    modifier onlyOwnerOrFundManager() {
        require(
            msg.sender == owner() || saccoContract.isFundManager(msg.sender),
            ERR_UNAUTHORIZED
        );
        _;
    }

    modifier onlySupportedToken(address _token) {
        require(supportedTokens[_token], "Token not supported");
        _;
    }

    constructor(address _saccoContract) Ownable(msg.sender) {
        require(_saccoContract != address(0), ERR_ZERO_ADDRESS);
        saccoContract = BlockCoopTokens(_saccoContract);
    }

    // ============ LIQUIDITY MANAGEMENT ============
    function addLiquidity(
        address _token,
        uint256 _amount
    ) external nonReentrant whenNotPaused onlySupportedToken(_token) {
        require(_amount > 0, ERR_INVALID_AMOUNT);

        LiquidityPool storage pool = liquidityPools[_token];
        require(pool.isActive, "Pool not active");

        // Update pool fees before changing liquidity
        // _updatePoolFees(_token);

        // Transfer tokens from user
        IERC20(_token).safeTransferFrom(msg.sender, address(this), _amount);

        // Calculate LP shares
        uint256 shares;
        if (pool.totalLPShares == 0) {
            shares = _amount; // First deposit gets 1:1 shares
        } else {
            shares = (_amount * pool.totalLPShares) / pool.totalLiquidity;
        }

        // Update pool state
        pool.totalLiquidity += _amount;
        pool.availableLiquidity += _amount;
        pool.totalLPShares += shares;

        // Update user position
        LPPosition storage position = lpPositions[_token][msg.sender];
        if (position.shares == 0) {
            position.depositTime = block.timestamp;
            userLPTokens[msg.sender].push(_token);
        }
        position.shares += shares;
        position.lastClaimTime = block.timestamp;

        emit LiquidityAdded(msg.sender, _token, _amount, shares);
    }

    function removeLiquidity(
        address _token,
        uint256 _shares
    ) external nonReentrant whenNotPaused onlySupportedToken(_token) {
        require(_shares > 0, ERR_INVALID_AMOUNT);

        LPPosition storage position = lpPositions[_token][msg.sender];
        require(position.shares >= _shares, "Insufficient shares");

        LiquidityPool storage pool = liquidityPools[_token];
        // _updatePoolFees(_token);

        // Calculate token amount to return
        uint256 tokenAmount = (_shares * pool.totalLiquidity) /
            pool.totalLPShares;
        require(
            pool.availableLiquidity >= tokenAmount,
            ERR_INSUFFICIENT_LIQUIDITY
        );

        // Update pool state
        pool.totalLiquidity -= tokenAmount;
        pool.availableLiquidity -= tokenAmount;
        pool.totalLPShares -= _shares;

        // Update user position
        position.shares -= _shares;
        if (position.shares == 0) {
            _removeTokenFromUserList(msg.sender, _token);
        }

        // Transfer tokens to user
        IERC20(_token).safeTransfer(msg.sender, tokenAmount);

        emit LiquidityRemoved(msg.sender, _token, tokenAmount, _shares);
    }

    function claimRewards(
        address _token
    ) external nonReentrant onlySupportedToken(_token) {
        LPPosition storage position = lpPositions[_token][msg.sender];
        require(position.shares > 0, "No liquidity position");

        // _updatePoolFees(_token);

        uint256 rewards = _calculatePendingRewards(_token, msg.sender);
        if (rewards > 0) {
            LiquidityPool storage pool = liquidityPools[_token];
            require(pool.accumulatedFees >= rewards, "Insufficient fee pool");

            pool.accumulatedFees -= rewards;
            position.lastClaimTime = block.timestamp;

            IERC20(_token).safeTransfer(msg.sender, rewards);
            emit RewardsClaimed(msg.sender, _token, rewards);
        }
    }

    // ============ LOAN MANAGEMENT ============

    function requestLoan(
        address _loanToken,
        uint256 _loanAmount,
        address[] calldata _collateralTokens,
        uint256[] calldata _collateralAmounts,
        uint256 _duration
    ) external nonReentrant whenNotPaused returns (uint256) {
        require(_loanAmount > 0, ERR_INVALID_AMOUNT);
        require(supportedTokens[_loanToken], "Token not supported for loans");
        require(
            _duration >= MIN_LOAN_DURATION && _duration <= MAX_LOAN_DURATION,
            "Invalid duration"
        );
        require(
            _collateralTokens.length == _collateralAmounts.length,
            "Array length mismatch"
        );
        require(_collateralTokens.length > 0, "No collateral provided");

        // Check if pool has enough liquidity
        LiquidityPool storage pool = liquidityPools[_loanToken];
        require(
            pool.availableLiquidity >= _loanAmount,
            ERR_INSUFFICIENT_LIQUIDITY
        );

        // Verify and lock collateral
        require(
            _verifyCollateral(
                msg.sender,
                _collateralTokens,
                _collateralAmounts
            ),
            "Insufficient collateral"
        );

        uint256 requestId = nextRequestId++;

        // Lock collateral in BlockCoopTokens
        for (uint256 i = 0; i < _collateralTokens.length; i++) {
            saccoContract.lockDepositAsCollateral(
                msg.sender,
                _collateralTokens[i],
                _collateralAmounts[i],
                requestId
            );
        }

        loanRequests[requestId] = LoanRequest({
            borrower: msg.sender,
            loanToken: _loanToken,
            loanAmount: _loanAmount,
            collateralTokens: _collateralTokens,
            collateralAmounts: _collateralAmounts,
            duration: _duration,
            approved: false,
            processed: false,
            timestamp: block.timestamp
        });

        userLoanRequests[msg.sender].push(requestId);
        pendingRequestIds.push(requestId);

        emit LoanRequested(requestId, msg.sender, _loanToken, _loanAmount);
        return requestId;
    }

    function approveLoanRequest(
        uint256 _requestId
    ) external onlyOwnerOrFundManager whenNotPaused {
        LoanRequest storage request = loanRequests[_requestId];
        require(!request.processed, "Request already processed");

        // Verify LTV ratio
        uint256 totalCollateralValueUSD = _calculateCollateralValue(
            request.collateralTokens,
            request.collateralAmounts
        );
        uint256 loanValueUSD = _calculateTokenValue(
            request.loanToken,
            request.loanAmount
        );
        uint256 maxLoanValueUSD = (totalCollateralValueUSD * BASE_LTV) /
            BASIS_POINTS;
        require(
            loanValueUSD <= maxLoanValueUSD,
            "Loan value exceeds maximum LTV"
        );

        // Check liquidity again
        LiquidityPool storage pool = liquidityPools[request.loanToken];
        require(
            pool.availableLiquidity >= request.loanAmount,
            ERR_INSUFFICIENT_LIQUIDITY
        );

        // Calculate interest rate
        uint256 adjustedRate = _calculateAdjustedInterestRate(
            request.borrower,
            totalCollateralValueUSD,
            loanValueUSD
        );

        // Create loan
        uint256 loanId = loanCount++;
        loans[loanId] = Loan({
            borrower: request.borrower,
            loanToken: request.loanToken,
            loanAmount: request.loanAmount,
            collateralTokens: request.collateralTokens,
            collateralAmounts: request.collateralAmounts,
            interestRate: adjustedRate,
            startTime: block.timestamp,
            duration: request.duration,
            isActive: true,
            totalRepaid: 0,
            id: loanId
        });

        // Update pool liquidity
        pool.availableLiquidity -= request.loanAmount;
        pool.totalBorrowed += request.loanAmount;

        // Update request status
        request.processed = true;
        request.approved = true;
        userLoans[request.borrower].push(loanId);

        // Transfer loan tokens to borrower
        IERC20(request.loanToken).safeTransfer(
            request.borrower,
            request.loanAmount
        );

        _removePendingRequest(_requestId);
        emit LoanApproved(_requestId, loanId);
    }

    /**
     * @dev Reject a loan request and unlock collateral
     * @param _requestId The ID of the loan request to reject
     */
    function rejectLoanRequest(
        uint256 _requestId
    ) external onlyOwnerOrFundManager whenNotPaused {
        LoanRequest storage request = loanRequests[_requestId];
        require(!request.processed, "Request already processed");
        require(request.borrower != address(0), "Invalid request");

        // Mark request as processed and rejected
        request.processed = true;
        request.approved = false;

        // Unlock all collateral tokens for this request
        for (uint256 i = 0; i < request.collateralTokens.length; i++) {
            saccoContract.unlockCollateral(
                request.borrower,
                request.collateralTokens[i],
                _requestId
            );
        }

        _removePendingRequest(_requestId);
        emit LoanRejected(_requestId, request.borrower);
    }

    /**
     * @dev Liquidate an overdue loan
     * @param _loanId The ID of the loan to liquidate
     */
    function liquidateLoan(
        uint256 _loanId
    ) external nonReentrant whenNotPaused {
        Loan storage loan = loans[_loanId];
        require(loan.isActive, "Loan not active");
        require(
            block.timestamp > loan.startTime + loan.duration,
            "Loan not yet overdue"
        );

        uint256 totalDue = _calculateTotalDue(loan);
        uint256 remainingDebt = totalDue > loan.totalRepaid
            ? totalDue - loan.totalRepaid
            : 0;

        // Deactivate the loan
        loan.isActive = false;

        // Process liquidation
        _processLiquidation(loan, remainingDebt);

        emit LoanLiquidated(
            _loanId,
            msg.sender,
            remainingDebt,
            _calculateCollateralValue(
                loan.collateralTokens,
                loan.collateralAmounts
            )
        );
    }

    /**
     * @dev Internal function to process liquidation
     */
    function _processLiquidation(
        Loan storage loan,
        uint256 remainingDebt
    ) internal {
        uint256 totalCollateralValueUSD = _calculateCollateralValue(
            loan.collateralTokens,
            loan.collateralAmounts
        );

        LiquidityPool storage pool = liquidityPools[loan.loanToken];

        // Process each collateral token
        for (uint256 i = 0; i < loan.collateralTokens.length; i++) {
            _liquidateCollateralToken(
                loan,
                i,
                remainingDebt,
                totalCollateralValueUSD,
                pool
            );
        }

        // Update pool state
        if (remainingDebt > 0) {
            pool.totalBorrowed = pool.totalBorrowed > remainingDebt
                ? pool.totalBorrowed - remainingDebt
                : 0;
        }
    }

    /**
     * @dev Internal function to liquidate a single collateral token
     */
    function _liquidateCollateralToken(
        Loan storage loan,
        uint256 tokenIndex,
        uint256 remainingDebt,
        uint256 totalCollateralValueUSD,
        LiquidityPool storage pool
    ) internal {
        address collateralToken = loan.collateralTokens[tokenIndex];
        uint256 collateralAmount = loan.collateralAmounts[tokenIndex];

        // Calculate token share
        uint256 tokenValueUSD = _calculateTokenValue(
            collateralToken,
            collateralAmount
        );
        uint256 tokenShare = totalCollateralValueUSD > 0
            ? (tokenValueUSD * BASIS_POINTS) / totalCollateralValueUSD
            : 0;

        // Calculate distribution amounts
        uint256 debtRepayment = remainingDebt > 0
            ? (collateralAmount * tokenShare * remainingDebt) /
                (BASIS_POINTS * totalCollateralValueUSD)
            : 0;

        uint256[4] memory amounts = [
            debtRepayment,
            (collateralAmount * 200) / BASIS_POINTS, // 2% protocol fee
            (collateralAmount * 300) / BASIS_POINTS, // 3% liquidator reward
            collateralAmount -
                debtRepayment -
                (collateralAmount * 500) /
                BASIS_POINTS // Return to borrower
        ];

        address[4] memory recipients = [
            address(this), // For debt repayment
            owner(), // Protocol fee
            msg.sender, // Liquidator reward
            loan.borrower // Return to borrower
        ];

        // Convert to dynamic arrays for function call
        address[] memory recipientArray = new address[](4);
        uint256[] memory amountArray = new uint256[](4);

        for (uint256 j = 0; j < 4; j++) {
            recipientArray[j] = recipients[j];
            amountArray[j] = amounts[j];
        }

        // Liquidate collateral through BlockCoopTokens
        saccoContract.liquidateCollateral(
            loan.borrower,
            collateralToken,
            loan.id,
            recipientArray,
            amountArray
        );

        // Handle debt repayment
        if (debtRepayment > 0) {
            if (collateralToken == loan.loanToken) {
                pool.availableLiquidity += debtRepayment;
            } else {
                pool.accumulatedFees += debtRepayment;
            }
        }
    }

    /**
     * @dev Check if a loan is eligible for liquidation
     * @param _loanId The ID of the loan to check
     * @return bool True if loan can be liquidated
     */
    function isLoanLiquidatable(uint256 _loanId) external view returns (bool) {
        Loan storage loan = loans[_loanId];
        return
            loan.isActive && block.timestamp > loan.startTime + loan.duration;
    }

    /**
     * @dev Get liquidation info for a loan
     * @param _loanId The ID of the loan
     * @return totalDue Total amount due
     * @return totalRepaid Amount already repaid
     * @return collateralValue Total collateral value in USD
     * @return timeRemaining Time until liquidation (0 if overdue)
     */
    function getLiquidationInfo(
        uint256 _loanId
    )
        external
        view
        returns (
            uint256 totalDue,
            uint256 totalRepaid,
            uint256 collateralValue,
            uint256 timeRemaining
        )
    {
        Loan storage loan = loans[_loanId];
        totalDue = _calculateTotalDue(loan);
        totalRepaid = loan.totalRepaid;
        collateralValue = _calculateCollateralValue(
            loan.collateralTokens,
            loan.collateralAmounts
        );

        uint256 endTime = loan.startTime + loan.duration;
        timeRemaining = block.timestamp < endTime
            ? endTime - block.timestamp
            : 0;
    }

    function repayLoan(
        uint256 _loanId,
        uint256 _amount
    ) external nonReentrant whenNotPaused {
        Loan storage loan = loans[_loanId];
        require(loan.isActive, ERR_LOAN_NOT_ACTIVE);
        require(_amount > 0, ERR_INVALID_AMOUNT);

        uint256 totalDue = _calculateTotalDue(loan);
        uint256 remainingDebt = totalDue - loan.totalRepaid;
        uint256 repayAmount = _amount > remainingDebt ? remainingDebt : _amount;

        // Transfer repayment from borrower
        IERC20(loan.loanToken).safeTransferFrom(
            msg.sender,
            address(this),
            repayAmount
        );

        // Calculate interest portion
        uint256 principalPortion = repayAmount;
        uint256 interestPortion = 0;

        if (loan.totalRepaid < loan.loanAmount) {
            // Still paying principal + interest
            uint256 totalInterest = totalDue - loan.loanAmount;
            uint256 interestPaid = loan.totalRepaid > loan.loanAmount
                ? loan.totalRepaid - loan.loanAmount
                : 0;
            interestPortion = (repayAmount * totalInterest) / remainingDebt;
            principalPortion = repayAmount - interestPortion;
        }

        loan.totalRepaid += repayAmount;

        // Update pool liquidity
        LiquidityPool storage pool = liquidityPools[loan.loanToken];
        pool.availableLiquidity += principalPortion; // Principal goes back to available liquidity
        pool.accumulatedFees +=
            (interestPortion * (BASIS_POINTS - PROTOCOL_FEE)) /
            BASIS_POINTS;

        if (interestPortion > 0) {
            pool.totalBorrowed -= principalPortion;
        }

        emit LoanRepaid(_loanId, repayAmount, interestPortion);

        // Check if loan is fully repaid
        if (loan.totalRepaid >= totalDue) {
            _returnCollateral(loan);
            loan.isActive = false;
            pool.totalBorrowed -= (loan.loanAmount - principalPortion);
        }
    }

    // ============ ADMIN FUNCTIONS ============

    function addSupportedToken(address _token) external onlyOwnerOrFundManager {
        require(_token != address(0), ERR_ZERO_ADDRESS);
        require(!supportedTokens[_token], "Token already supported");

        // Verify token is whitelisted in saccoContract
        (, , bool isWhitelisted) = saccoContract.whiteListedTokens(_token);
        require(isWhitelisted, "Token not whitelisted in sacco");

        supportedTokens[_token] = true;
        supportedTokenList.push(_token);

        // Initialize liquidity pool
        liquidityPools[_token] = LiquidityPool({
            totalLiquidity: 0,
            availableLiquidity: 0,
            totalBorrowed: 0,
            totalLPShares: 0,
            accumulatedFees: 0,
            lastUpdateTime: block.timestamp,
            isActive: true
        });

        emit PoolCreated(_token);
    }

    function setPoolStatus(
        address _token,
        bool _isActive
    ) external onlyOwner onlySupportedToken(_token) {
        liquidityPools[_token].isActive = _isActive;
        emit PoolStatusChanged(_token, _isActive);
    }

    // ============ INTERNAL FUNCTIONS ============

    // function _updatePoolFees(address _token) internal {
    //     LiquidityPool storage pool = liquidityPools[_token];
    //     uint256 timeElapsed = block.timestamp - pool.lastUpdateTime;

    //     if (timeElapsed > 0 && pool.totalBorrowed > 0) {
    //         pool.lastUpdateTime = block.timestamp;
    //     }
    // }

    function _calculatePendingRewards(
        address _token,
        address _user
    ) internal view returns (uint256) {
        LPPosition storage position = lpPositions[_token][_user];
        LiquidityPool storage pool = liquidityPools[_token];

        if (position.shares == 0 || pool.totalLPShares == 0) {
            return 0;
        }

        uint256 userShare = (position.shares * BASIS_POINTS) /
            pool.totalLPShares;
        uint256 timeElapsed = block.timestamp - position.lastClaimTime;

        // Calculate rewards based on user's share of accumulated fees
        return (pool.accumulatedFees * userShare) / BASIS_POINTS;
    }

    function _removeTokenFromUserList(address _user, address _token) internal {
        address[] storage tokens = userLPTokens[_user];
        for (uint256 i = 0; i < tokens.length; i++) {
            if (tokens[i] == _token) {
                tokens[i] = tokens[tokens.length - 1];
                tokens.pop();
                break;
            }
        }
    }

    function _removePendingRequest(uint256 _requestId) internal {
        for (uint256 i = 0; i < pendingRequestIds.length; i++) {
            if (pendingRequestIds[i] == _requestId) {
                pendingRequestIds[i] = pendingRequestIds[
                    pendingRequestIds.length - 1
                ];
                pendingRequestIds.pop();
                break;
            }
        }
    }

    function _returnCollateral(Loan storage loan) internal {
        for (uint256 i = 0; i < loan.collateralTokens.length; i++) {
            saccoContract.unlockCollateral(
                loan.borrower,
                loan.collateralTokens[i],
                loan.id
            );
        }
        emit CollateralReturned(loan.id, loan.borrower);
    }

    function _calculateTotalDue(
        Loan memory loan
    ) internal view returns (uint256) {
        uint256 timeElapsed = block.timestamp - loan.startTime;
        uint256 interest = (loan.loanAmount * loan.interestRate * timeElapsed) /
            (SECONDS_PER_YEAR * BASIS_POINTS);
        return loan.loanAmount + interest;
    }

    function _calculateCollateralValue(
        address[] memory tokens,
        uint256[] memory amounts
    ) internal view returns (uint256) {
        uint256 totalValueUSD = 0;
        for (uint256 i = 0; i < tokens.length; i++) {
            totalValueUSD += _calculateTokenValue(tokens[i], amounts[i]);
        }
        return totalValueUSD;
    }

    function _calculateTokenValue(
        address token,
        uint256 amount
    ) internal view returns (uint256) {
        return saccoContract.calculateTokenValueUSD(token, amount);
    }

    function _calculateAdjustedInterestRate(
        address borrower,
        uint256 collateralValueUSD,
        uint256 loanValueUSD
    ) internal view returns (uint256) {
        uint256 rate = baseLoanInterestRate;
        uint256 ltvRatio = (loanValueUSD * BASIS_POINTS) / collateralValueUSD;

        if (ltvRatio > 5000) {
            rate += 200; // Add 2% for high LTV
        }

        uint256 completedLoans = userLoans[borrower].length;
        if (completedLoans > 0) {
            rate = rate > 100 ? rate - 100 : 0; // Reduce by 1% for history
        }

        return rate > MAX_INTEREST_RATE ? MAX_INTEREST_RATE : rate;
    }

    function _verifyCollateral(
        address borrower,
        address[] memory tokens,
        uint256[] memory amounts
    ) internal view returns (bool) {
        for (uint256 i = 0; i < tokens.length; i++) {
            (, , bool isWhitelisted) = saccoContract.whiteListedTokens(
                tokens[i]
            );
            (uint256 balance, ) = saccoContract.userDeposits(
                borrower,
                tokens[i]
            );
            if (!isWhitelisted || balance < amounts[i]) {
                return false;
            }
        }
        return true;
    }

    // ============ VIEW FUNCTIONS ============

    function getPoolInfo(
        address _token
    )
        external
        view
        returns (
            uint256 totalLiquidity,
            uint256 availableLiquidity,
            uint256 totalBorrowed,
            uint256 totalShares,
            uint256 accumulatedFees,
            bool isActive
        )
    {
        LiquidityPool storage pool = liquidityPools[_token];
        return (
            pool.totalLiquidity,
            pool.availableLiquidity,
            pool.totalBorrowed,
            pool.totalLPShares,
            pool.accumulatedFees,
            pool.isActive
        );
    }

    function getBorrowerLoanRequests(
        address _borrower
    ) external view returns (LoanRequest[] memory) {
        uint256[] memory requestIds = userLoanRequests[_borrower];
        LoanRequest[] memory requests = new LoanRequest[](requestIds.length);

        for (uint256 i = 0; i < requestIds.length; i++) {
            requests[i] = loanRequests[requestIds[i]];
        }

        return requests;
    }

    function getUserLPPosition(
        address _user,
        address _token
    )
        external
        view
        returns (uint256 shares, uint256 depositTime, uint256 pendingRewards)
    {
        LPPosition storage position = lpPositions[_token][_user];
        return (
            position.shares,
            position.depositTime,
            _calculatePendingRewards(_token, _user)
        );
    }

    function getUserLPTokens(
        address _user
    ) external view returns (address[] memory) {
        return userLPTokens[_user];
    }

    function getSupportedTokens() external view returns (address[] memory) {
        return supportedTokenList;
    }

    function getPendingRequestIds() external view returns (uint256[] memory) {
        return pendingRequestIds;
    }

    function getPendingRequests() external view returns (LoanRequest[] memory) {
        LoanRequest[] memory requests = new LoanRequest[](
            pendingRequestIds.length
        );
        for (uint256 i = 0; i < pendingRequestIds.length; i++) {
            requests[i] = loanRequests[pendingRequestIds[i]];
        }
        return requests;
    }

    // function getUserLoans(address _user) external view returns (Loan[] memory) {
    //     uint256[] memory loanIds = userLoans[_user];
    //     Loan[] memory userLoansList = new Loan[](loanIds.length);

    //     for (uint256 i = 0; i < loanIds.length; i++) {
    //         userLoansList[i] = loans[loanIds[i]];
    //     }

    //     return userLoansList;
    // }
}
