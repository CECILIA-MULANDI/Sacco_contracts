// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/IERC20Metadata.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/utils/Pausable.sol";
import "@chainlink/contracts/src/v0.8/shared/interfaces/AggregatorV3Interface.sol";

/**
 * @title BlockCoopTokens
 * @dev Manages token deposits, withdrawals, and price feeds for the BlockCoop Sacco
 * @notice This contract handles token whitelisting, price feed management, and user deposits
 */
contract BlockCoopTokens is Ownable, ReentrancyGuard, Pausable {
    using SafeERC20 for IERC20;

    bool public emergencyPaused;
    string public pauseReason;
    uint256 public unpauseTimelock;
    uint256 public constant UNPAUSE_DELAY = 2 days;
    address public loanManager;
    //Error messages
    string constant ERR_ZERO_ADDRESS = "Zero address not allowed";
    string constant ERR_UNAUTHORIZED = "Unauthorized access";
    string constant ERR_TOKEN_NOT_WHITELISTED = "Token not whitelisted";
    string constant ERR_TOKEN_ALREADY_WHITELISTED = "Token already whitelisted";
    string constant ERR_INVALID_PRICE_FEED = "Invalid price feed";
    string constant ERR_STALE_PRICE = "Price data is stale";
    string constant ERR_NO_PRICE_FEED = "No price feed available";
    string constant ERR_ZERO_AMOUNT = "Amount must be greater than 0";
    string constant ERR_INSUFFICIENT_ALLOWANCE = "Insufficient token allowance";
    string constant ERR_INVALID_PRICE = "Invalid price from oracle";
    string constant ERR_PRICE_FEED_STALE = "Price feed data is stale";
    string constant ERR_PRICE_FEED_ROUND_INCOMPLETE =
        "Price feed round is not complete";
    string constant ERR_PRICE_FEED_ROUND_STALE = "Price feed round is stale";
    string constant ERR_PRICE_FEED_REGISTRY_ERROR =
        "Failed to fetch price from registry: ";
    string constant ERR_EMERGENCY_PAUSED = "Contract is emergency paused";
    string constant ERR_UNPAUSE_TIMELOCK = "Unpause timelock not expired";
    string constant ERR_INSUFFICIENT_BALANCE = "Insufficient available balance";
    string constant ERR_ONLY_LOAN_MANAGER = "Only LoanManager can call";

    /**
     * @dev Maximum number of tokens to process in a single iteration to prevent DOS
     */
    uint256 public constant MAX_ITERATION_COUNT = 100;

    /**
     * @dev Threshold for considering price feed data stale
     */
    uint256 public stalePriceThreshold = 24 hours;

    /**
     * @dev Standard number of decimals used for price calculations
     */
    uint8 public constant STANDARD_DECIMALS = 18;

    /**
     * @dev Struct to store token information
     * @param tokenAddress The address of the token
     * @param priceFeed The address of the price feed for the token
     * @param isWhitelisted Whether the token is whitelisted
     */
    struct TokenInfo {
        address tokenAddress;
        address priceFeed;
        bool isWhitelisted;
    }

    /**
     * @dev Struct to store user deposit information
     * @param amount The amount of tokens deposited
     * @param depositTimestamp The timestamp when the deposit was made
     */
    struct UserDeposit {
        uint256 amount;
        uint256 depositTimestamp;
    }

    // Modify the CollateralLock struct
    struct CollateralLock {
        uint256 amount;
        uint256 loanId;
        bool isLocked;
    }

    mapping(address => TokenInfo) public whiteListedTokens;
    mapping(address => bool) public isStablecoin;
    // user -> token -> deposit
    mapping(address => mapping(address => UserDeposit)) public userDeposits;
    mapping(address => address[]) public userDepositedTokens;

    mapping(address => bool) public isFundManager;
    // This keeps track of the position/index of each token in the tokenList array
    mapping(address => uint256) public tokenIndex;
    // Change the mapping to use a simpler structure
    mapping(address => mapping(address => mapping(uint256 => uint256)))
        public collateralAmounts;
    mapping(address => mapping(address => mapping(uint256 => bool)))
        public collateralLocked;
    mapping(uint256 => address[]) public loanCollateral; // loanId => collateral tokens
    mapping(address => uint256[]) public userLoanIds; // use
    // Track active (whitelisted) tokens for efficient iteration
    uint256 public activeTokenCount;
    address[] public tokenList;

    address[] public activeFundManagers;
    // loanId => array of collateral tokens

    // Add emergency pause events
    event EmergencyPaused(address indexed pauser, string reason);
    event EmergencyUnpauseInitiated(
        address indexed initiator,
        uint256 executeAfter
    );
    event EmergencyUnpaused(address indexed unpauser);

    /**
     * @dev Emitted when a token is whitelisted
     * @param tokenAddress The address of the whitelisted token
     * @param priceFeed The address of the price feed for the token
     */
    event TokenWhitelisted(
        address indexed tokenAddress,
        address indexed priceFeed
    );
    event FundManagerRemoved(address indexed fundManager);
    event TokenRemoved(address indexed tokenAddress);
    event FundManagerAdded(address indexed fundManager);
    event StablecoinAdded(address indexed tokenAddress);
    event StablecoinRemoved(address indexed tokenAddress);
    event DepositMade(
        address indexed user,
        address indexed tokenAddress,
        uint256 amount
    );
    event WithdrawalMade(
        address indexed user,
        address indexed tokenAddress,
        uint256 amount
    );

    event StalePriceThresholdUpdated(
        uint256 oldThreshold,
        uint256 newThreshold
    );
    event PriceFeedUpdated(
        address indexed tokenAddress,
        address indexed oldPriceFeed,
        address indexed newPriceFeed
    );
    event CollateralLocked(
        address indexed user,
        address indexed token,
        uint256 amount,
        uint256 indexed loanId
    );
    event CollateralUnlocked(
        address indexed user,
        address indexed token,
        uint256 indexed loanId
    );
    event LoanManagerSet(address indexed loanManager);
    event SpenderApproved(
        address indexed spender,
        address indexed token,
        uint256 amount
    );
    event TokenPriceUpdated(
        address indexed token,
        uint256 oldPrice,
        uint256 newPrice
    );
    event TokenDecimalsUpdated(
        address indexed token,
        uint8 oldDecimals,
        uint8 newDecimals
    );

    // Add new emergency functions
    event EmergencyWithdraw(address indexed token, uint256 amount);
    event TokenPaused(address indexed token, bool paused);

    // Add new state variables
    mapping(address => bool) public pausedTokens;

    // Add timelock state variables
    uint256 public constant TIMELOCK_DURATION = 2 days;
    mapping(bytes32 => uint256) public pendingActions;

    // Add multi-sig state variables
    uint256 public requiredSignatures;
    mapping(address => bool) public isSigner;
    mapping(bytes32 => mapping(address => bool)) public hasSigned;

    event ActionQueued(bytes32 indexed actionId, uint256 executeAfter);
    event ActionExecuted(bytes32 indexed actionId);
    event SignerAdded(address indexed signer);
    event SignerRemoved(address indexed signer);
    event RequiredSignaturesUpdated(uint256 oldCount, uint256 newCount);

    modifier onlyLoanManager() {
        require(msg.sender == loanManager, ERR_ONLY_LOAN_MANAGER);
        _;
    }

    modifier tokenRequirements(address _tokenAddress) {
        require(_tokenAddress != address(0), ERR_ZERO_ADDRESS);
        require(
            !whiteListedTokens[_tokenAddress].isWhitelisted,
            ERR_TOKEN_ALREADY_WHITELISTED
        );
        _;
    }

    modifier onlyOwnerOrFundManager() {
        require(
            msg.sender == owner() || isFundManager[msg.sender],
            ERR_UNAUTHORIZED
        );
        _;
    }

    modifier whenNotEmergencyPaused() {
        require(!emergencyPaused, ERR_EMERGENCY_PAUSED);
        _;
    }

    constructor() Ownable(msg.sender) ReentrancyGuard() Pausable() {
        isFundManager[msg.sender] = true;
        activeFundManagers.push(msg.sender);
    }

    function addFundManager(address _manager) external onlyOwner {
        require(_manager != address(0), ERR_ZERO_ADDRESS);
        require(!isFundManager[_manager], "Already a fund manager");

        isFundManager[_manager] = true;
        activeFundManagers.push(_manager);

        emit FundManagerAdded(_manager);
    }

    function removeFundManager(address _manager) external onlyOwner {
        require(isFundManager[_manager], "Not a fund manager");

        isFundManager[_manager] = false;

        // Remove from the array (find and replace with last element, then pop)
        for (uint i = 0; i < activeFundManagers.length; i++) {
            if (activeFundManagers[i] == _manager) {
                activeFundManagers[i] = activeFundManagers[
                    activeFundManagers.length - 1
                ];
                activeFundManagers.pop();
                break;
            }
        }

        emit FundManagerRemoved(_manager);
    }

    function updateStalePriceThreshold(
        uint256 _newThreshold
    ) external onlyOwner {
        require(_newThreshold > 0, "Threshold must be greater than 0");
        uint256 oldThreshold = stalePriceThreshold;
        stalePriceThreshold = _newThreshold;
        emit StalePriceThresholdUpdated(oldThreshold, _newThreshold);
    }

    function pause() external onlyOwner {
        _pause();
    }

    function unpause() external onlyOwner {
        _unpause();
    }

    function emergencyPause(string calldata reason) external onlyOwner {
        bytes32 actionId = keccak256(
            abi.encodePacked("emergencyPause", reason)
        );
        require(
            block.timestamp >= pendingActions[actionId],
            "Timelock not expired"
        );

        require(!emergencyPaused, "Contract is already paused");
        emergencyPaused = true;
        pauseReason = reason;
        emit EmergencyPaused(msg.sender, reason);
    }

    function initiateEmergencyUnpause() external onlyOwner {
        require(emergencyPaused, "Contract is not paused");
        unpauseTimelock = block.timestamp + UNPAUSE_DELAY;
        emit EmergencyUnpauseInitiated(msg.sender, unpauseTimelock);
    }

    function executeEmergencyUnpause() external onlyOwner {
        require(emergencyPaused, "Contract is not paused");
        require(block.timestamp >= unpauseTimelock, ERR_UNPAUSE_TIMELOCK);
        emergencyPaused = false;
        pauseReason = "";
        unpauseTimelock = 0;
        emit EmergencyUnpaused(msg.sender);
    }

    function whitelistToken(
        address _tokenAddress,
        address _priceFeed,
        bool _isStable
    )
        external
        tokenRequirements(_tokenAddress)
        onlyOwnerOrFundManager
        whenNotEmergencyPaused
    {
        bytes32 actionId = keccak256(
            abi.encodePacked(
                "whitelistToken",
                _tokenAddress,
                _priceFeed,
                _isStable
            )
        );
        require(
            block.timestamp >= pendingActions[actionId],
            "Timelock not expired"
        );

        require(_tokenAddress != address(0), ERR_ZERO_ADDRESS);

        // If price feed is provided and not stable, validate it
        if (!_isStable && _priceFeed != address(0)) {
            try AggregatorV3Interface(_priceFeed).latestRoundData() returns (
                uint80 roundId,
                int256 price,
                uint256 /* startedAt */,
                uint256 updatedAt,
                uint80 answeredInRound
            ) {
                require(price > 0, "Invalid price feed");
                require(updatedAt > 0, ERR_PRICE_FEED_ROUND_INCOMPLETE);
                require(
                    block.timestamp - updatedAt <= stalePriceThreshold,
                    ERR_PRICE_FEED_STALE
                );
                require(answeredInRound >= roundId, ERR_PRICE_FEED_ROUND_STALE);
            } catch {
                revert(ERR_INVALID_PRICE_FEED);
            }
        }

        whiteListedTokens[_tokenAddress] = TokenInfo({
            tokenAddress: _tokenAddress,
            priceFeed: _priceFeed,
            isWhitelisted: true
        });
        isStablecoin[_tokenAddress] = _isStable;
        tokenIndex[_tokenAddress] = tokenList.length;
        tokenList.push(_tokenAddress);
        activeTokenCount++;
        emit TokenWhitelisted(_tokenAddress, _priceFeed);

        if (_isStable) {
            emit StablecoinAdded(_tokenAddress);
        }
    }

    function updatePriceFeed(
        address _tokenAddress,
        address _newPriceFeed
    ) external onlyOwnerOrFundManager whenNotEmergencyPaused {
        require(_tokenAddress != address(0), ERR_ZERO_ADDRESS);
        TokenInfo storage tokenInfo = whiteListedTokens[_tokenAddress];
        require(tokenInfo.isWhitelisted, ERR_TOKEN_NOT_WHITELISTED);

        address oldPriceFeed = tokenInfo.priceFeed;
        tokenInfo.priceFeed = _newPriceFeed;

        emit PriceFeedUpdated(_tokenAddress, oldPriceFeed, _newPriceFeed);
    }

    function unWhitelistToken(
        address _tokenAddress
    ) external onlyOwnerOrFundManager whenNotEmergencyPaused {
        TokenInfo storage token = whiteListedTokens[_tokenAddress];
        require(token.isWhitelisted, ERR_TOKEN_NOT_WHITELISTED);

        token.isWhitelisted = false;
        activeTokenCount--;
        uint256 indexToRemove = tokenIndex[_tokenAddress];
        uint256 lastIndex = tokenList.length - 1;
        if (indexToRemove != lastIndex) {
            address lastToken = tokenList[lastIndex];
            tokenList[indexToRemove] = lastToken;
            tokenIndex[lastToken] = indexToRemove;
        }
        tokenList.pop();
        delete tokenIndex[_tokenAddress];
        emit TokenRemoved(_tokenAddress);
    }

    function deposit(
        address _tokenAddress,
        uint256 _amount
    ) external nonReentrant whenNotPaused whenNotEmergencyPaused {
        require(_amount > 0, ERR_ZERO_AMOUNT);
        require(
            whiteListedTokens[_tokenAddress].isWhitelisted,
            ERR_TOKEN_NOT_WHITELISTED
        );

        IERC20 token = IERC20(_tokenAddress);
        token.safeTransferFrom(msg.sender, address(this), _amount);

        UserDeposit storage userDeposit = userDeposits[msg.sender][
            _tokenAddress
        ];

        // Add token to user's deposited tokens list if not already present
        if (userDeposit.amount == 0) {
            userDepositedTokens[msg.sender].push(_tokenAddress);
        }

        userDeposit.amount += _amount;
        userDeposit.depositTimestamp = block.timestamp;

        emit DepositMade(msg.sender, _tokenAddress, _amount);
    }

    function setLoanManager(address _loanManager) external onlyOwner {
        require(_loanManager != address(0), ERR_ZERO_ADDRESS);
        loanManager = _loanManager;
        emit LoanManagerSet(_loanManager);
    }

    function approveSpender(
        address spender,
        address token,
        uint256 amount
    ) external onlyOwner {
        require(spender != address(0) && token != address(0), ERR_ZERO_ADDRESS);
        IERC20(token).approve(spender, amount);
        emit SpenderApproved(spender, token, amount);
    }

    function lockDepositAsCollateral(
        address user,
        address _tokenAddress,
        uint256 _amount,
        uint256 _loanId
    )
        external
        onlyLoanManager
        nonReentrant
        whenNotPaused
        whenNotEmergencyPaused
    {
        require(_amount > 0, ERR_ZERO_AMOUNT);
        require(
            whiteListedTokens[_tokenAddress].isWhitelisted,
            ERR_TOKEN_NOT_WHITELISTED
        );
        require(!pausedTokens[_tokenAddress], "Token is paused");

        UserDeposit storage userDeposit = userDeposits[user][_tokenAddress];
        require(
            userDeposit.amount >=
                _amount + getLockedAmount(user, _tokenAddress),
            ERR_INSUFFICIENT_BALANCE
        );

        require(
            !collateralLocked[user][_tokenAddress][_loanId],
            "Collateral already locked for loan"
        );

        collateralAmounts[user][_tokenAddress][_loanId] = _amount;
        collateralLocked[user][_tokenAddress][_loanId] = true;

        loanCollateral[_loanId].push(_tokenAddress);
        userLoanIds[user].push(_loanId);

        emit CollateralLocked(user, _tokenAddress, _amount, _loanId);
    }

    function unlockCollateral(
        address user,
        address _tokenAddress,
        uint256 _loanId
    )
        external
        onlyLoanManager
        nonReentrant
        whenNotPaused
        whenNotEmergencyPaused
    {
        require(
            collateralLocked[user][_tokenAddress][_loanId],
            "No locked collateral"
        );

        collateralLocked[user][_tokenAddress][_loanId] = false;
        collateralAmounts[user][_tokenAddress][_loanId] = 0;

        // Remove from loan collateral list
        address[] storage collateralTokens = loanCollateral[_loanId];
        for (uint256 i = 0; i < collateralTokens.length; i++) {
            if (collateralTokens[i] == _tokenAddress) {
                collateralTokens[i] = collateralTokens[
                    collateralTokens.length - 1
                ];
                collateralTokens.pop();
                break;
            }
        }

        // Remove from user loan IDs
        uint256[] storage loanIds = userLoanIds[user];
        for (uint256 i = 0; i < loanIds.length; i++) {
            if (loanIds[i] == _loanId) {
                loanIds[i] = loanIds[loanIds.length - 1];
                loanIds.pop();
                break;
            }
        }

        emit CollateralUnlocked(user, _tokenAddress, _loanId);
    }

    function getLockedAmount(
        address user,
        address token
    ) public view returns (uint256) {
        uint256 totalLocked = 0;
        uint256[] storage loanIds = userLoanIds[user];
        for (uint256 i = 0; i < loanIds.length; i++) {
            if (collateralLocked[user][token][loanIds[i]]) {
                totalLocked += collateralAmounts[user][token][loanIds[i]];
            }
        }
        return totalLocked;
    }

    function withdraw(
        address _tokenAddress,
        uint256 _amount
    ) external nonReentrant whenNotPaused whenNotEmergencyPaused {
        require(_amount > 0, ERR_ZERO_AMOUNT);
        UserDeposit storage userDeposit = userDeposits[msg.sender][
            _tokenAddress
        ];
        require(
            userDeposit.amount >=
                _amount + getLockedAmount(msg.sender, _tokenAddress),
            ERR_INSUFFICIENT_BALANCE
        );
        userDeposit.amount -= _amount;
        if (userDeposit.amount == 0) {
            address[] storage tokens = userDepositedTokens[msg.sender];
            for (uint256 i = 0; i < tokens.length; i++) {
                if (tokens[i] == _tokenAddress) {
                    tokens[i] = tokens[tokens.length - 1];
                    tokens.pop();
                    break;
                }
            }
        }
        IERC20(_tokenAddress).safeTransfer(msg.sender, _amount);
        emit WithdrawalMade(msg.sender, _tokenAddress, _amount);
    }

    function getTokenPrice(address _token) external view returns (uint256) {
        require(
            whiteListedTokens[_token].isWhitelisted,
            ERR_TOKEN_NOT_WHITELISTED
        );

        // Handle stablecoins first - they always return $1 with 18 decimals
        if (isStablecoin[_token]) {
            return 1e18; // $1 with 18 decimals precision
        }

        // For non-stablecoins, require a price feed
        require(
            whiteListedTokens[_token].priceFeed != address(0),
            ERR_NO_PRICE_FEED
        );

        AggregatorV3Interface priceFeed = AggregatorV3Interface(
            whiteListedTokens[_token].priceFeed
        );

        (, int256 price, , uint256 updatedAt, ) = priceFeed.latestRoundData();
        require(price > 0, ERR_INVALID_PRICE);
        require(
            block.timestamp - updatedAt <= stalePriceThreshold,
            ERR_STALE_PRICE
        );

        uint8 decimals = priceFeed.decimals();
        return uint256(price) * (10 ** (STANDARD_DECIMALS - decimals));
    }

    function _validatePriceFeed(
        address _priceFeed
    ) internal view returns (bool) {
        if (_priceFeed == address(0)) return false;

        try AggregatorV3Interface(_priceFeed).latestRoundData() returns (
            uint80 roundId,
            int256 price,
            uint256 startedAt,
            uint256 updatedAt,
            uint80 answeredInRound
        ) {
            if (price <= 0) return false;
            if (block.timestamp - updatedAt > stalePriceThreshold) return false;
            if (answeredInRound < roundId) return false;
            return true;
        } catch {
            return false;
        }
    }

    function updateTokenDecimals(
        address _token,
        uint8 _newDecimals
    ) external onlyOwner {
        require(
            whiteListedTokens[_token].isWhitelisted,
            ERR_TOKEN_NOT_WHITELISTED
        );
        uint8 oldDecimals = IERC20Metadata(_token).decimals();
        require(_newDecimals <= 18, "Invalid decimals");

        emit TokenDecimalsUpdated(_token, oldDecimals, _newDecimals);
    }

    function updatePriceFeedDecimals(
        address _token,
        uint8 _newDecimals
    ) external onlyOwner {
        require(
            whiteListedTokens[_token].isWhitelisted,
            ERR_TOKEN_NOT_WHITELISTED
        );
        require(
            whiteListedTokens[_token].priceFeed != address(0),
            ERR_NO_PRICE_FEED
        );
        require(_newDecimals <= 18, "Invalid decimals");

        AggregatorV3Interface priceFeed = AggregatorV3Interface(
            whiteListedTokens[_token].priceFeed
        );
        uint8 oldDecimals = priceFeed.decimals();

        emit TokenDecimalsUpdated(_token, oldDecimals, _newDecimals);
    }

    function getTokensInfo(
        uint256 _offset,
        uint256 _limit
    )
        external
        view
        returns (
            address[] memory tokens,
            string[] memory names,
            string[] memory symbols,
            uint8[] memory decimals,
            uint256[] memory prices
        )
    {
        require(_limit <= MAX_ITERATION_COUNT, "Limit too high");
        uint256 end = _offset + _limit;
        if (end > tokenList.length) {
            end = tokenList.length;
        }

        uint256 count = end - _offset;
        tokens = new address[](count);
        names = new string[](count);
        symbols = new string[](count);
        decimals = new uint8[](count);
        prices = new uint256[](count);

        for (uint256 i = 0; i < count; i++) {
            address tokenAddress = tokenList[_offset + i];
            tokens[i] = tokenAddress;

            // Skip non-whitelisted tokens
            if (!whiteListedTokens[tokenAddress].isWhitelisted) {
                continue;
            }

            // Get token metadata
            IERC20Metadata token = IERC20Metadata(tokenAddress);
            try token.name() returns (string memory name) {
                names[i] = name;
            } catch {
                names[i] = "Unknown";
            }

            try token.symbol() returns (string memory symbol) {
                symbols[i] = symbol;
            } catch {
                symbols[i] = "UNK";
            }

            try token.decimals() returns (uint8 tokenDecimals) {
                decimals[i] = tokenDecimals;
            } catch {
                decimals[i] = 18; // Default to 18 if call fails
            }

            // Get price more efficiently
            if (isStablecoin[tokenAddress]) {
                prices[i] = 1e18; // $1 with 18 decimals
            } else {
                address priceFeed = whiteListedTokens[tokenAddress].priceFeed;
                if (priceFeed != address(0)) {
                    try
                        AggregatorV3Interface(priceFeed).latestRoundData()
                    returns (
                        uint80 /* roundId */,
                        int256 price,
                        uint256 /* startedAt */,
                        uint256 updatedAt,
                        uint80 answeredInRound
                    ) {
                        if (
                            price > 0 &&
                            block.timestamp - updatedAt <=
                            stalePriceThreshold &&
                            answeredInRound >= uint80(0)
                        ) {
                            uint8 priceFeedDecimals = AggregatorV3Interface(
                                priceFeed
                            ).decimals();
                            prices[i] =
                                uint256(price) *
                                (10 ** (STANDARD_DECIMALS - priceFeedDecimals));
                        } else {
                            prices[i] = 0;
                        }
                    } catch {
                        prices[i] = 0;
                    }
                } else {
                    prices[i] = 0;
                }
            }
        }
    }

    function getUserTotalDepositValue(
        address _user
    ) external view returns (uint256) {
        uint256 totalValue = 0;
        address[] memory tokens = userDepositedTokens[_user];

        for (uint256 i = 0; i < tokens.length; i++) {
            address tokenAddress = tokens[i];
            UserDeposit storage userDeposit = userDeposits[_user][tokenAddress];
            if (userDeposit.amount > 0) {
                try this.getTokenPrice(tokenAddress) returns (uint256 price) {
                    uint8 tokenDecimals;
                    try IERC20Metadata(tokenAddress).decimals() returns (
                        uint8 decimals
                    ) {
                        tokenDecimals = decimals;
                    } catch {
                        tokenDecimals = 18; // Default to 18 if call fails
                    }

                    totalValue +=
                        (userDeposit.amount * price) /
                        (10 ** tokenDecimals);
                } catch {
                    // Skip tokens with price errors
                }
            }
        }

        return totalValue;
    }

    function getTotalDepositValue() external view returns (uint256) {
        uint256 totalValue = 0;

        for (uint256 i = 0; i < tokenList.length; i++) {
            address tokenAddress = tokenList[i];

            if (!whiteListedTokens[tokenAddress].isWhitelisted) {
                continue; // Skip non-whitelisted tokens
            }

            try this.getTokenPrice(tokenAddress) returns (uint256 price) {
                uint8 tokenDecimals;
                try IERC20Metadata(tokenAddress).decimals() returns (
                    uint8 decimals
                ) {
                    tokenDecimals = decimals;
                } catch {
                    tokenDecimals = 18; // Default to 18 if call fails
                }

                uint256 balance = IERC20(tokenAddress).balanceOf(address(this));
                totalValue += (balance * price) / (10 ** tokenDecimals);
            } catch {
                // Skip tokens with price errors
            }
        }

        return totalValue;
    }

    // Get user's portfolio value with pagination to prevent DOS
    function getUserTotalValueUSD(
        address _user,
        uint256 _offset,
        uint256 _limit
    ) external view returns (uint256 totalValue, uint256 processedTokens) {
        address[] memory tokens = userDepositedTokens[_user];
        uint256 limit = _limit > MAX_ITERATION_COUNT
            ? MAX_ITERATION_COUNT
            : _limit;
        uint256 end = _offset + limit > tokens.length
            ? tokens.length
            : _offset + limit;

        for (uint256 i = _offset; i < end; i++) {
            address tokenAddr = tokens[i];
            uint256 amount = userDeposits[_user][tokenAddr].amount;

            if (amount > 0) {
                try this.calculateTokenValueUSD(tokenAddr, amount) returns (
                    uint256 value
                ) {
                    totalValue += value;
                } catch {
                    // Skip tokens with price errors
                }
            }
            processedTokens++;
        }

        return (totalValue, processedTokens);
    }

    // Check if a user has a specific token deposited
    function hasUserDepositedToken(
        address _user,
        address _token
    ) external view returns (bool) {
        return userDeposits[_user][_token].amount > 0;
    }

    // Get all deposited tokens for a user
    function getUserDepositedTokens(
        address _user
    ) external view returns (address[] memory) {
        return userDepositedTokens[_user];
    }

    // Get total number of whitelisted tokens
    function getWhitelistedTokenCount() external view returns (uint256) {
        return activeTokenCount;
    }

    // Get all active fund managers
    function getAllActiveFundManagers()
        external
        view
        returns (address[] memory)
    {
        return activeFundManagers;
    }

    // Function to set/unset stablecoin status
    function setStablecoinStatus(
        address _tokenAddress,
        bool _isStable
    ) external onlyOwnerOrFundManager whenNotEmergencyPaused {
        TokenInfo storage token = whiteListedTokens[_tokenAddress];
        require(token.isWhitelisted, ERR_TOKEN_NOT_WHITELISTED);

        // Only emit event if status is actually changing
        if (isStablecoin[_tokenAddress] != _isStable) {
            isStablecoin[_tokenAddress] = _isStable;

            if (_isStable) {
                emit StablecoinAdded(_tokenAddress);
            } else {
                emit StablecoinRemoved(_tokenAddress);
            }
        }
    }

    function calculateTokenValueUSD(
        address _tokenAddress,
        uint256 _amount
    ) public view returns (uint256) {
        require(_amount > 0, ERR_ZERO_AMOUNT);
        require(
            whiteListedTokens[_tokenAddress].isWhitelisted,
            ERR_TOKEN_NOT_WHITELISTED
        );

        // Get token price in standardized format (8 decimals)
        uint256 tokenPrice = this.getTokenPrice(_tokenAddress);

        // Get token decimals
        uint8 tokenDecimals;
        try IERC20Metadata(_tokenAddress).decimals() returns (uint8 decimals) {
            tokenDecimals = decimals;
        } catch {
            tokenDecimals = 18; // Default to 18 if call fails
        }

        // Calculate value with proper decimal handling
        // formula: (amount * price) / (10^tokenDecimals)
        return (_amount * tokenPrice) / (10 ** tokenDecimals);
    }

    function getUserDeposit(
        address _user,
        address _token
    ) external view returns (uint256 amount, uint256 depositTimestamp) {
        UserDeposit storage userDeposit = userDeposits[_user][_token];
        return (userDeposit.amount, userDeposit.depositTimestamp);
    }

    // Add new emergency functions
    function emergencyWithdraw(address _token) external onlyOwner {
        require(emergencyPaused, "Only available during emergency");
        uint256 balance = IERC20(_token).balanceOf(address(this));
        IERC20(_token).safeTransfer(owner(), balance);
        emit EmergencyWithdraw(_token, balance);
    }

    function pauseToken(address _token) external onlyOwner {
        require(
            whiteListedTokens[_token].isWhitelisted,
            ERR_TOKEN_NOT_WHITELISTED
        );
        pausedTokens[_token] = true;
        emit TokenPaused(_token, true);
    }

    function unpauseToken(address _token) external onlyOwner {
        require(
            whiteListedTokens[_token].isWhitelisted,
            ERR_TOKEN_NOT_WHITELISTED
        );
        pausedTokens[_token] = false;
        emit TokenPaused(_token, false);
    }

    modifier onlySigner() {
        require(isSigner[msg.sender], "Not a signer");
        _;
    }

    function queueAction(bytes32 actionId) internal {
        pendingActions[actionId] = block.timestamp + TIMELOCK_DURATION;
        emit ActionQueued(actionId, pendingActions[actionId]);
    }

    function executeAction(bytes32 actionId) internal {
        require(
            block.timestamp >= pendingActions[actionId],
            "Timelock not expired"
        );
        delete pendingActions[actionId];
        emit ActionExecuted(actionId);
    }

    function addSigner(address _signer) external onlyOwner {
        require(!isSigner[_signer], "Already a signer");
        isSigner[_signer] = true;
        emit SignerAdded(_signer);
    }

    function removeSigner(address _signer) external onlyOwner {
        require(isSigner[_signer], "Not a signer");
        isSigner[_signer] = false;
        emit SignerRemoved(_signer);
    }

    function updateRequiredSignatures(uint256 _newCount) external onlyOwner {
        require(_newCount > 0, "Must require at least 1 signature");
        uint256 oldCount = requiredSignatures;
        requiredSignatures = _newCount;
        emit RequiredSignaturesUpdated(oldCount, _newCount);
    }
}
