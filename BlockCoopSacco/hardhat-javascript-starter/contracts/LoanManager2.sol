// // SPDX-License-Identifier: MIT
// pragma solidity ^0.8.19;
// import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
// import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
// import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
// import "@openzeppelin/contracts/access/Ownable.sol";
// import "@openzeppelin/contracts/utils/Pausable.sol";
// import "./BlockCoopTokens.sol";
// import "@openzeppelin/contracts/token/ERC20/extensions/IERC20Metadata.sol";

// contract LoanManager is Ownable, ReentrancyGuard, Pausable {
//     using SafeERC20 for IERC20;

//     // Constants
//     uint256 public constant MAX_LOAN_DURATION = 365 days;
//     uint256 public constant MIN_LOAN_DURATION = 7 days;
//     uint256 public constant MAX_LTV_RATIO = 7000; // 70% LTV
//     uint256 public constant MAX_INTEREST_RATE = 5000; // 50%
//     uint256 public constant SECONDS_PER_YEAR = 31536000; // 365 days
//     uint256 public constant MAX_DECIMALS = 18;
//     uint256 public constant MIN_DECIMALS = 6;

//     // Error messages
//     string constant ERR_ZERO_ADDRESS = "Zero address not allowed";
//     string constant ERR_UNAUTHORIZED = "Unauthorized access";
//     string constant ERR_INVALID_AMOUNT = "Invalid amount";
//     string constant ERR_INVALID_DURATION = "Invalid duration";
//     string constant ERR_ARRAY_MISMATCH = "Array length mismatch";
//     string constant ERR_INSUFFICIENT_COLLATERAL = "Insufficient collateral";
//     string constant ERR_TOKEN_NOT_WHITELISTED = "Token not whitelisted";
//     string constant ERR_UNSUPPORTED_TOKEN = "Token not supported for loans";
//     string constant ERR_LOAN_NOT_ACTIVE = "Loan not active";
//     string constant ERR_REQUEST_ALREADY_PROCESSED = "Request already processed";
//     string constant ERR_INSUFFICIENT_LIQUIDITY = "Insufficient pool liquidity";

//     struct LoanRequest {
//         address borrower;
//         address loanToken;
//         uint256 loanAmount;
//         address[] collateralTokens;
//         uint256[] collateralAmounts;
//         uint256 duration;
//         bool approved;
//         bool processed;
//     }

//     struct Loan {
//         address borrower;
//         address loanToken;
//         uint256 loanAmount;
//         address[] collateralTokens;
//         uint256[] collateralAmounts;
//         uint256 interestRate;
//         uint256 startTime;
//         uint256 duration;
//         bool isActive;
//         uint256 totalRepaid;
//         uint256 id;
//     }

//     struct LendingPool {
//         uint256 totalDeposited;
//         uint256 totalBorrowed;
//         uint256 availableLiquidity;
//         uint256 totalInterestEarned;
//         mapping(address => uint256) lenderDeposits;
//         mapping(address => uint256) lenderInterestEarned;
//         address[] lenders;
//     }

//     struct LenderPosition {
//         uint256 amount;
//         uint256 depositTime;
//         uint256 interestEarned;
//         uint256 lastClaimTime;
//     }

//     BlockCoopTokens public saccoContract;
//     uint256 public baseLoanInterestRate = 500; // 5%
//     uint256 public lenderInterestRate = 300; // 3% (what lenders earn)
//     uint256 public protocolFeeRate = 200; // 2% (protocol keeps this)
//     uint256 public loanCount = 0;
//     uint256 public nextRequestId;

//     mapping(uint256 => Loan) public loans;
//     mapping(uint256 => LoanRequest) public loanRequests;
//     mapping(address => uint256[]) public userLoans;
//     mapping(address => uint256[]) public userLoanRequests;
//     mapping(address => bool) public supportedLoanTokens;
//     mapping(address => LendingPool) public lendingPools;
//     mapping(address => mapping(address => LenderPosition))
//         public lenderPositions; // lender => token => position
//     mapping(address => address[]) public lenderTokens; // lender => list of tokens they've provided liquidity for
//     address[] public tokenList;
//     uint256[] private allLoanRequestIds;

//     // Events
//     event LoanRequested(
//         uint256 indexed requestId,
//         address indexed borrower,
//         address indexed loanToken,
//         uint256 loanAmount,
//         uint256 duration
//     );
//     event LoanApproved(uint256 indexed requestId, uint256 indexed loanId);
//     event LoanRejected(uint256 indexed requestId, address indexed borrower);
//     event LoanRepaid(uint256 indexed loanId, uint256 amount);
//     event CollateralReturned(uint256 indexed loanId, address indexed borrower);
//     event TokenSupportAdded(address indexed token);
//     event TokenSupportRemoved(address indexed token);
//     event SaccoLiquidityAdded(address indexed token, uint256 amount);
//     event SaccoLiquidityRemoved(address indexed token, uint256 amount);
//     event LiquidityProvided(
//         address indexed lender,
//         address indexed token,
//         uint256 amount
//     );
//     event LiquidityWithdrawn(
//         address indexed lender,
//         address indexed token,
//         uint256 amount
//     );
//     event InterestClaimed(
//         address indexed lender,
//         address indexed token,
//         uint256 amount
//     );
//     event InterestRateUpdated(
//         uint256 oldLenderRate,
//         uint256 newLenderRate,
//         uint256 oldProtocolRate,
//         uint256 newProtocolRate
//     );

//     modifier onlyOwnerOrFundManager() {
//         require(
//             msg.sender == owner() || saccoContract.isFundManager(msg.sender),
//             ERR_UNAUTHORIZED
//         );
//         _;
//     }

//     constructor(address _saccoContract) Ownable(msg.sender) {
//         require(_saccoContract != address(0), ERR_ZERO_ADDRESS);
//         saccoContract = BlockCoopTokens(_saccoContract);
//     }

//     function requestLoan(
//         address _loanToken,
//         uint256 _loanAmount,
//         address[] calldata _collateralTokens,
//         uint256[] calldata _collateralAmounts,
//         uint256 _duration
//     ) external nonReentrant whenNotPaused returns (uint256) {
//         require(_loanAmount > 0, ERR_INVALID_AMOUNT);
//         require(supportedLoanTokens[_loanToken], ERR_UNSUPPORTED_TOKEN);
//         require(
//             _duration >= MIN_LOAN_DURATION && _duration <= MAX_LOAN_DURATION,
//             ERR_INVALID_DURATION
//         );
//         require(
//             _collateralTokens.length == _collateralAmounts.length,
//             ERR_ARRAY_MISMATCH
//         );
//         require(_collateralTokens.length > 0, "No collateral provided");

//         // Verify collateral in BlockCoopTokens
//         require(
//             _verifyCollateral(
//                 msg.sender,
//                 _collateralTokens,
//                 _collateralAmounts
//             ),
//             ERR_INSUFFICIENT_COLLATERAL
//         );

//         // Lock collateral in BlockCoopTokens
//         uint256 requestId = nextRequestId++;
//         for (uint256 i = 0; i < _collateralTokens.length; i++) {
//             saccoContract.lockDepositAsCollateral(
//                 msg.sender,
//                 _collateralTokens[i],
//                 _collateralAmounts[i],
//                 requestId
//             );
//         }

//         loanRequests[requestId] = LoanRequest({
//             borrower: msg.sender,
//             loanToken: _loanToken,
//             loanAmount: _loanAmount,
//             collateralTokens: _collateralTokens,
//             collateralAmounts: _collateralAmounts,
//             duration: _duration,
//             approved: false,
//             processed: false
//         });

//         userLoanRequests[msg.sender].push(requestId);
//         allLoanRequestIds.push(requestId);

//         emit LoanRequested(
//             requestId,
//             msg.sender,
//             _loanToken,
//             _loanAmount,
//             _duration
//         );
//         return requestId;
//     }

//     function provideLiquidity(
//         address _token,
//         uint256 _amount
//     ) external nonReentrant whenNotPaused {
//         require(_amount > 0, ERR_INVALID_AMOUNT);
//         require(supportedLoanTokens[_token], ERR_UNSUPPORTED_TOKEN);

//         IERC20(_token).safeTransferFrom(msg.sender, address(this), _amount);

//         LendingPool storage pool = lendingPools[_token];
//         LenderPosition storage position = lenderPositions[msg.sender][_token];

//         // If first time providing this token, add to lender's token list
//         if (position.amount == 0) {
//             lenderTokens[msg.sender].push(_token);
//             pool.lenders.push(msg.sender);
//         }

//         // Update position
//         position.amount += _amount;
//         position.depositTime = block.timestamp;
//         position.lastClaimTime = block.timestamp;

//         // Update pool
//         pool.totalDeposited += _amount;
//         pool.availableLiquidity += _amount;
//         pool.lenderDeposits[msg.sender] += _amount;

//         emit LiquidityProvided(msg.sender, _token, _amount);
//     }

//     // NEW: Function for lenders to withdraw their liquidity
//     function withdrawLiquidity(
//         address _token,
//         uint256 _amount
//     ) external nonReentrant whenNotPaused {
//         require(_amount > 0, ERR_INVALID_AMOUNT);

//         LendingPool storage pool = lendingPools[_token];
//         LenderPosition storage position = lenderPositions[msg.sender][_token];

//         require(position.amount >= _amount, "Insufficient balance");
//         require(pool.availableLiquidity >= _amount, ERR_INSUFFICIENT_LIQUIDITY);

//         // Update position
//         position.amount -= _amount;

//         // Update pool
//         pool.totalDeposited -= _amount;
//         pool.availableLiquidity -= _amount;
//         pool.lenderDeposits[msg.sender] -= _amount;

//         // Transfer tokens back to lender
//         IERC20(_token).safeTransfer(msg.sender, _amount);

//         // Remove from lists if position is now zero
//         if (position.amount == 0) {
//             _removeLenderToken(msg.sender, _token);
//             _removeLenderFromPool(_token, msg.sender);
//         }

//         emit LiquidityWithdrawn(msg.sender, _token, _amount);
//     }

//     // NEW: Function for lenders to claim their interest
//     function claimInterest(address _token) external nonReentrant whenNotPaused {
//         LenderPosition storage position = lenderPositions[msg.sender][_token];
//         require(position.amount > 0, "No position found");

//         uint256 interestToClaim = _calculateLenderInterest(msg.sender, _token);
//         require(interestToClaim > 0, "No interest to claim");

//         LendingPool storage pool = lendingPools[_token];

//         // Update position
//         position.interestEarned += interestToClaim;
//         position.lastClaimTime = block.timestamp;

//         // Update pool
//         pool.lenderInterestEarned[msg.sender] += interestToClaim;

//         // Transfer interest (assuming we have enough in the pool from loan repayments)
//         IERC20(_token).safeTransfer(msg.sender, interestToClaim);

//         emit InterestClaimed(msg.sender, _token, interestToClaim);
//     }

//     // NEW: Calculate interest earned by a lender
//     function _calculateLenderInterest(
//         address lender,
//         address token
//     ) internal view returns (uint256) {
//         LenderPosition storage position = lenderPositions[lender][token];
//         if (position.amount == 0) return 0;

//         LendingPool storage pool = lendingPools[token];
//         if (pool.totalDeposited == 0) return 0;

//         // Calculate time-based interest
//         uint256 timeElapsed = block.timestamp - position.lastClaimTime;
//         uint256 interest = (position.amount *
//             lenderInterestRate *
//             timeElapsed) / (SECONDS_PER_YEAR * 10000);

//         // Add proportional share of interest from loans
//         uint256 lenderShare = (position.amount * 10000) / pool.totalDeposited;
//         uint256 poolInterestShare = (pool.totalInterestEarned * lenderShare) /
//             10000;

//         return interest + poolInterestShare;
//     }

//     // MODIFIED: Enhanced loan approval to distribute interest
//     function approveLoanRequest(
//         uint256 _requestId
//     ) external onlyOwnerOrFundManager whenNotPaused {
//         LoanRequest storage request = loanRequests[_requestId];
//         require(!request.processed, ERR_REQUEST_ALREADY_PROCESSED);
//         require(!request.approved, "Request already approved");

//         // Check liquidity
//         LendingPool storage pool = lendingPools[request.loanToken];
//         require(
//             pool.availableLiquidity >= request.loanAmount,
//             ERR_INSUFFICIENT_LIQUIDITY
//         );

//         // Verify LTV ratio
//         uint256 totalCollateralValueUSD = _calculateCollateralValue(
//             request.collateralTokens,
//             request.collateralAmounts
//         );
//         uint256 loanValueUSD = _calculateTokenValue(
//             request.loanToken,
//             request.loanAmount
//         );
//         uint256 maxLoanValueUSD = (totalCollateralValueUSD * MAX_LTV_RATIO) /
//             10000;
//         require(
//             loanValueUSD <= maxLoanValueUSD,
//             "Loan value exceeds maximum LTV"
//         );

//         // Calculate interest rate
//         uint256 adjustedRate = _calculateAdjustedInterestRate(
//             request.borrower,
//             totalCollateralValueUSD,
//             loanValueUSD
//         );

//         // Create loan
//         uint256 loanId = loanCount++;
//         loans[loanId] = Loan({
//             borrower: request.borrower,
//             loanToken: request.loanToken,
//             loanAmount: request.loanAmount,
//             collateralTokens: request.collateralTokens,
//             collateralAmounts: request.collateralAmounts,
//             interestRate: adjustedRate,
//             startTime: block.timestamp,
//             duration: request.duration,
//             isActive: true,
//             totalRepaid: 0,
//             id: loanId
//         });

//         // Update request
//         request.processed = true;
//         request.approved = true;
//         userLoans[request.borrower].push(loanId);

//         // Update pool
//         pool.totalBorrowed += request.loanAmount;
//         pool.availableLiquidity -= request.loanAmount;

//         // Transfer loan tokens
//         IERC20(request.loanToken).safeTransfer(
//             request.borrower,
//             request.loanAmount
//         );

//         emit LoanApproved(_requestId, loanId);
//     }

//     // MODIFIED: Enhanced loan repayment to distribute interest
//     function repayLoan(
//         uint256 _loanId,
//         uint256 _amount
//     ) external nonReentrant whenNotPaused {
//         Loan storage loan = loans[_loanId];
//         require(loan.isActive, ERR_LOAN_NOT_ACTIVE);
//         require(_amount > 0, ERR_INVALID_AMOUNT);

//         IERC20 loanToken = IERC20(loan.loanToken);
//         loanToken.safeTransferFrom(msg.sender, address(this), _amount);

//         loan.totalRepaid += _amount;

//         // Calculate interest portion of payment
//         uint256 totalDue = _calculateTotalDue(loan);
//         uint256 principalDue = loan.loanAmount;
//         uint256 interestDue = totalDue > principalDue
//             ? totalDue - principalDue
//             : 0;

//         uint256 interestPortion = 0;
//         if (interestDue > 0) {
//             // Calculate what portion of this payment is interest
//             uint256 remainingPrincipal = loan.loanAmount >
//                 (loan.totalRepaid - _amount)
//                 ? loan.loanAmount - (loan.totalRepaid - _amount)
//                 : 0;

//             if (_amount > remainingPrincipal) {
//                 interestPortion = _amount - remainingPrincipal;
//             }
//         }

//         // Distribute interest between lenders and protocol
//         if (interestPortion > 0) {
//             LendingPool storage pool = lendingPools[loan.loanToken];
//             uint256 lenderShare = (interestPortion * lenderInterestRate) /
//                 (lenderInterestRate + protocolFeeRate);
//             uint256 protocolShare = interestPortion - lenderShare;

//             pool.totalInterestEarned += lenderShare;
//             pool.availableLiquidity += _amount; // Add repayment back to available liquidity

//             // Protocol share stays in contract for owner to withdraw
//         } else {
//             // If no interest, just add back to liquidity
//             LendingPool storage pool = lendingPools[loan.loanToken];
//             pool.availableLiquidity += _amount;
//         }

//         emit LoanRepaid(_loanId, _amount);

//         // Return collateral if fully repaid
//         if (loan.totalRepaid >= _calculateTotalDue(loan)) {
//             _returnCollateral(loan);
//             loan.isActive = false;
//         }
//     }

//     // NEW: View functions for lenders
//     function getLenderPosition(
//         address lender,
//         address token
//     )
//         external
//         view
//         returns (
//             uint256 amount,
//             uint256 depositTime,
//             uint256 interestEarned,
//             uint256 pendingInterest
//         )
//     {
//         LenderPosition storage position = lenderPositions[lender][token];
//         return (
//             position.amount,
//             position.depositTime,
//             position.interestEarned,
//             _calculateLenderInterest(lender, token)
//         );
//     }

//     function getLenderTokens(
//         address lender
//     ) external view returns (address[] memory) {
//         return lenderTokens[lender];
//     }

//     function getPoolInfo(
//         address token
//     )
//         external
//         view
//         returns (
//             uint256 totalDeposited,
//             uint256 totalBorrowed,
//             uint256 availableLiquidity,
//             uint256 utilizationRate,
//             address[] memory lenders
//         )
//     {
//         LendingPool storage pool = lendingPools[token];
//         uint256 utilization = pool.totalDeposited > 0
//             ? (pool.totalBorrowed * 10000) / pool.totalDeposited
//             : 0;

//         return (
//             pool.totalDeposited,
//             pool.totalBorrowed,
//             pool.availableLiquidity,
//             utilization,
//             pool.lenders
//         );
//     }

//     // NEW: Admin functions
//     function updateInterestRates(
//         uint256 _lenderRate,
//         uint256 _protocolRate
//     ) external onlyOwner {
//         require(
//             _lenderRate + _protocolRate <= baseLoanInterestRate,
//             "Rates exceed loan rate"
//         );

//         uint256 oldLenderRate = lenderInterestRate;
//         uint256 oldProtocolRate = protocolFeeRate;

//         lenderInterestRate = _lenderRate;
//         protocolFeeRate = _protocolRate;

//         emit InterestRateUpdated(
//             oldLenderRate,
//             _lenderRate,
//             oldProtocolRate,
//             _protocolRate
//         );
//     }

//     function withdrawProtocolFees(address _token) external onlyOwner {
//         uint256 balance = IERC20(_token).balanceOf(address(this));
//         LendingPool storage pool = lendingPools[_token];
//         uint256 poolReserves = pool.availableLiquidity + pool.totalBorrowed;

//         require(balance > poolReserves, "No fees to withdraw");
//         uint256 fees = balance - poolReserves;

//         IERC20(_token).safeTransfer(owner(), fees);
//     }

//     // Helper functions
//     function _removeLenderToken(address lender, address token) internal {
//         address[] storage tokens = lenderTokens[lender];
//         for (uint256 i = 0; i < tokens.length; i++) {
//             if (tokens[i] == token) {
//                 tokens[i] = tokens[tokens.length - 1];
//                 tokens.pop();
//                 break;
//             }
//         }
//     }

//     function _removeLenderFromPool(address token, address lender) internal {
//         LendingPool storage pool = lendingPools[token];
//         for (uint256 i = 0; i < pool.lenders.length; i++) {
//             if (pool.lenders[i] == lender) {
//                 pool.lenders[i] = pool.lenders[pool.lenders.length - 1];
//                 pool.lenders.pop();
//                 break;
//             }
//         }
//     }

//     function rejectLoanRequest(
//         uint256 _requestId
//     ) external onlyOwnerOrFundManager whenNotPaused {
//         LoanRequest storage request = loanRequests[_requestId];
//         require(!request.processed, ERR_REQUEST_ALREADY_PROCESSED);
//         require(!request.approved, "Request already approved");

//         // Unlock collateral
//         for (uint256 i = 0; i < request.collateralTokens.length; i++) {
//             saccoContract.unlockCollateral(
//                 request.borrower,
//                 request.collateralTokens[i],
//                 _requestId
//             );
//         }

//         request.processed = true;
//         request.approved = false;

//         emit LoanRejected(_requestId, request.borrower);
//     }

//     function _returnCollateral(Loan storage loan) internal {
//         for (uint256 i = 0; i < loan.collateralTokens.length; i++) {
//             saccoContract.unlockCollateral(
//                 loan.borrower,
//                 loan.collateralTokens[i],
//                 loan.id
//             );
//         }
//         emit CollateralReturned(loan.id, loan.borrower);
//     }

//     function _calculateTotalDue(
//         Loan memory loan
//     ) internal view returns (uint256) {
//         uint256 timeElapsed = block.timestamp - loan.startTime;
//         uint256 interest = (loan.loanAmount * loan.interestRate * timeElapsed) /
//             (SECONDS_PER_YEAR * 10000);
//         return loan.loanAmount + interest;
//     }

//     function _calculateCollateralValue(
//         address[] memory tokens,
//         uint256[] memory amounts
//     ) internal view returns (uint256) {
//         uint256 totalValueUSD = 0;
//         for (uint256 i = 0; i < tokens.length; i++) {
//             totalValueUSD += _calculateTokenValue(tokens[i], amounts[i]);
//         }
//         return totalValueUSD;
//     }

//     function _calculateTokenValue(
//         address token,
//         uint256 amount
//     ) internal view returns (uint256) {
//         uint8 decimals = IERC20Metadata(token).decimals();
//         require(
//             decimals >= MIN_DECIMALS && decimals <= MAX_DECIMALS,
//             "Invalid token decimals"
//         );
//         uint256 tokenPriceUSD = saccoContract.getTokenPrice(token);
//         return (amount * tokenPriceUSD * (10 ** (18 - decimals))) / 1e18;
//     }

//     function _calculateAdjustedInterestRate(
//         address borrower,
//         uint256 collateralValueUSD,
//         uint256 loanValueUSD
//     ) internal view returns (uint256) {
//         uint256 rate = baseLoanInterestRate;
//         uint256 ltvRatio = (loanValueUSD * 10000) / collateralValueUSD;
//         if (ltvRatio > 5000) {
//             rate += 200; // Add 2% for high LTV
//         }
//         uint256 completedLoans = userLoans[borrower].length;
//         if (completedLoans > 0) {
//             rate = rate > 100 ? rate - 100 : 0; // Reduce by 1% for history
//         }
//         return rate > MAX_INTEREST_RATE ? MAX_INTEREST_RATE : rate;
//     }

//     function _verifyCollateral(
//         address borrower,
//         address[] memory tokens,
//         uint256[] memory amounts
//     ) internal view returns (bool) {
//         require(tokens.length == amounts.length, ERR_ARRAY_MISMATCH);
//         require(tokens.length > 0, "No collateral provided");
//         for (uint256 i = 0; i < tokens.length; i++) {
//             (, , bool isWhitelisted) = saccoContract.whiteListedTokens(
//                 tokens[i]
//             );
//             (uint256 balance, ) = saccoContract.userDeposits(
//                 borrower,
//                 tokens[i]
//             );
//             if (!isWhitelisted || balance < amounts[i]) {
//                 return false;
//             }
//         }
//         return true;
//     }

//     function addSupportedLoanToken(
//         address _token
//     ) external onlyOwnerOrFundManager {
//         require(_token != address(0), ERR_ZERO_ADDRESS);
//         require(!supportedLoanTokens[_token], "Token already supported");
//         (, , bool isWhitelisted) = saccoContract.whiteListedTokens(_token);
//         require(isWhitelisted, ERR_TOKEN_NOT_WHITELISTED);
//         supportedLoanTokens[_token] = true;
//         tokenList.push(_token);
//         emit TokenSupportAdded(_token);
//     }

//     function removeSupportedLoanToken(
//         address _token
//     ) external onlyOwnerOrFundManager {
//         require(supportedLoanTokens[_token], "Token not supported");
//         supportedLoanTokens[_token] = false;
//         for (uint256 i = 0; i < tokenList.length; i++) {
//             if (tokenList[i] == _token) {
//                 tokenList[i] = tokenList[tokenList.length - 1];
//                 tokenList.pop();
//                 break;
//             }
//         }
//         emit TokenSupportRemoved(_token);
//     }

//     function addSaccoLiquidity(
//         address _token,
//         uint256 _amount
//     ) external onlyOwner {
//         require(supportedLoanTokens[_token], ERR_UNSUPPORTED_TOKEN);
//         require(_amount > 0, ERR_INVALID_AMOUNT);
//         IERC20(_token).safeTransferFrom(
//             address(saccoContract),
//             address(this),
//             _amount
//         );
//         LendingPool storage pool = lendingPools[_token];
//         pool.totalDeposited += _amount;
//         pool.availableLiquidity += _amount;
//         emit SaccoLiquidityAdded(_token, _amount);
//     }

//     function removeSaccoLiquidity(
//         address _token,
//         uint256 _amount
//     ) external onlyOwner {
//         require(supportedLoanTokens[_token], ERR_UNSUPPORTED_TOKEN);
//         require(_amount > 0, ERR_INVALID_AMOUNT);
//         LendingPool storage pool = lendingPools[_token];
//         require(pool.availableLiquidity >= _amount, ERR_INSUFFICIENT_LIQUIDITY);
//         pool.totalDeposited -= _amount;
//         pool.availableLiquidity -= _amount;
//         IERC20(_token).safeTransfer(address(saccoContract), _amount);
//         emit SaccoLiquidityRemoved(_token, _amount);
//     }

//     // View functions
//     function getUserLoanRequests(
//         address _user
//     ) external view returns (uint256[] memory) {
//         return userLoanRequests[_user];
//     }

//     function getUserLoans(
//         address _user
//     ) external view returns (uint256[] memory) {
//         return userLoans[_user];
//     }

//     function getLoanDetails(
//         uint256 _loanId
//     )
//         external
//         view
//         returns (
//             address borrower,
//             address loanToken,
//             uint256 loanAmount,
//             uint256 startTime,
//             uint256 duration,
//             bool isActive,
//             uint256 totalRepaid
//         )
//     {
//         Loan storage loan = loans[_loanId];
//         return (
//             loan.borrower,
//             loan.loanToken,
//             loan.loanAmount,
//             loan.startTime,
//             loan.duration,
//             loan.isActive,
//             loan.totalRepaid
//         );
//     }

//     function getSupportedLoanTokens() external view returns (address[] memory) {
//         return tokenList;
//     }

//     function getLoanRequest(
//         uint256 _requestId
//     ) external view returns (LoanRequest memory) {
//         return loanRequests[_requestId];
//     }

//     function getBorrowerLoanRequests(
//         address _borrower
//     ) external view returns (LoanRequest[] memory) {
//         uint256[] memory requestIds = userLoanRequests[_borrower];
//         LoanRequest[] memory requests = new LoanRequest[](requestIds.length);

//         for (uint256 i = 0; i < requestIds.length; i++) {
//             requests[i] = loanRequests[requestIds[i]];
//         }

//         return requests;
//     }

//     function getPendingLoanRequests()
//         external
//         view
//         returns (LoanRequest[] memory)
//     {
//         uint256 pendingCount = 0;

//         // First, count pending requests
//         for (uint256 i = 0; i < allLoanRequestIds.length; i++) {
//             LoanRequest storage request = loanRequests[allLoanRequestIds[i]];
//             if (!request.processed && !request.approved) {
//                 pendingCount++;
//             }
//         }

//         // Create array of pending requests
//         LoanRequest[] memory pendingRequests = new LoanRequest[](pendingCount);
//         uint256 currentIndex = 0;

//         // Fill array with pending requests
//         for (
//             uint256 i = 0;
//             i < allLoanRequestIds.length && currentIndex < pendingCount;
//             i++
//         ) {
//             LoanRequest storage request = loanRequests[allLoanRequestIds[i]];
//             if (!request.processed && !request.approved) {
//                 pendingRequests[currentIndex] = request;
//                 currentIndex++;
//             }
//         }

//         return pendingRequests;
//     }
// }
