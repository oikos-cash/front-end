/**
 * Minimal ABI definitions for contract interactions.
 * Only includes functions actually used by the app.
 */

export const ERC20_ABI = [
  {
    inputs: [{ name: "spender", type: "address" }, { name: "amount", type: "uint256" }],
    name: "approve",
    outputs: [{ name: "", type: "bool" }],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [{ name: "owner", type: "address" }, { name: "spender", type: "address" }],
    name: "allowance",
    outputs: [{ name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [{ name: "account", type: "address" }],
    name: "balanceOf",
    outputs: [{ name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "decimals",
    outputs: [{ name: "", type: "uint8" }],
    stateMutability: "view",
    type: "function",
  },
] as const;

export const STAKING_ABI = [
  {
    inputs: [{ name: "_amount", type: "uint256" }],
    name: "stake",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [],
    name: "unstake",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [{ name: "user", type: "address" }],
    name: "stakedBalance",
    outputs: [{ name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "totalStaked",
    outputs: [{ name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "totalRewards",
    outputs: [{ name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [{ name: "user", type: "address" }],
    name: "lastOperationTimestamp",
    outputs: [{ name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "lockInEpochs",
    outputs: [{ name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "sOKS",
    outputs: [{ name: "", type: "address" }],
    stateMutability: "view",
    type: "function",
  },
] as const;

export const EXT_VAULT_ABI = [
  {
    inputs: [{ name: "borrowAmount", type: "uint256" }, { name: "duration", type: "uint256" }],
    name: "borrow",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [{ name: "amount", type: "uint256" }],
    name: "payback",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [{ name: "newDuration", type: "uint256" }],
    name: "roll",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [{ name: "amount", type: "uint256" }],
    name: "addCollateral",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
] as const;

export const LENDING_VAULT_ABI = [
  {
    inputs: [{ name: "who", type: "address" }],
    name: "getActiveLoan",
    outputs: [
      { name: "borrowAmount", type: "uint256" },
      { name: "collateralAmount", type: "uint256" },
      { name: "fees", type: "uint256" },
      { name: "expires", type: "uint256" },
      { name: "lastUpdate", type: "uint256" },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [{ name: "borrowAmount", type: "uint256" }, { name: "duration", type: "uint256" }],
    name: "calculateLoanFees",
    outputs: [{ name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
] as const;

export const PRESALE_ABI = [
  {
    inputs: [{ name: "referralCode", type: "bytes8" }],
    name: "deposit",
    outputs: [],
    stateMutability: "payable",
    type: "function",
  },
  {
    inputs: [],
    name: "withdraw",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [],
    name: "finalize",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [],
    name: "totalRaised",
    outputs: [{ name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "hardCap",
    outputs: [{ name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "softCap",
    outputs: [{ name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [{ name: "user", type: "address" }],
    name: "contributions",
    outputs: [{ name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "getParticipantCount",
    outputs: [{ name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "getTimeLeft",
    outputs: [{ name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "finalized",
    outputs: [{ name: "", type: "bool" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "softCapReached",
    outputs: [{ name: "", type: "bool" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "hasExpired",
    outputs: [{ name: "", type: "bool" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "deadline",
    outputs: [{ name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "initialPrice",
    outputs: [{ name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
] as const;

export const DIVIDENDS_ABI = [
  {
    inputs: [{ name: "rewardToken", type: "address" }],
    name: "claim",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [],
    name: "claimAll",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [{ name: "rewardToken", type: "address" }],
    name: "withdrawVested",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [],
    name: "withdrawAllVested",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [{ name: "rewardToken", type: "address" }, { name: "user", type: "address" }],
    name: "claimable",
    outputs: [{ name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [{ name: "rewardToken", type: "address" }],
    name: "getVestingEntries",
    outputs: [
      {
        name: "",
        type: "tuple[]",
        components: [
          { name: "amount", type: "uint256" },
          { name: "vestingEnd", type: "uint256" },
          { name: "claimed", type: "uint256" },
        ],
      },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [{ name: "rewardToken", type: "address" }],
    name: "getTotalDistributed",
    outputs: [{ name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "getRewardTokens",
    outputs: [{ name: "", type: "address[]" }],
    stateMutability: "view",
    type: "function",
  },
] as const;

export const FACTORY_ABI = [
  {
    inputs: [
      {
        name: "presaleParams",
        type: "tuple",
        components: [
          { name: "softCap", type: "uint256" },
          { name: "deadline", type: "uint256" },
        ],
      },
      {
        name: "vaultDeployParams",
        type: "tuple",
        components: [
          { name: "name", type: "string" },
          { name: "symbol", type: "string" },
          { name: "decimals", type: "uint8" },
          { name: "initialSupply", type: "uint256" },
          { name: "maxTotalSupply", type: "uint256" },
          { name: "IDOPrice", type: "uint256" },
          { name: "floorPrice", type: "uint256" },
          { name: "token1", type: "address" },
          { name: "feeTier", type: "uint24" },
          { name: "presale", type: "uint8" },
          { name: "isFreshDeploy", type: "bool" },
          { name: "useUniswap", type: "bool" },
        ],
      },
      {
        name: "existingDeployData",
        type: "tuple",
        components: [
          { name: "token0", type: "address" },
          { name: "pool", type: "address" },
          { name: "vaultAddress", type: "address" },
        ],
      },
    ],
    name: "deployVault",
    outputs: [
      { name: "vault", type: "address" },
      { name: "pool", type: "address" },
      { name: "token0", type: "address" },
    ],
    stateMutability: "payable",
    type: "function",
  },
  {
    inputs: [{ name: "_deployer", type: "address" }],
    name: "getVaults",
    outputs: [{ name: "", type: "address[]" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [{ name: "vault", type: "address" }],
    name: "getVaultDescription",
    outputs: [
      {
        name: "",
        type: "tuple",
        components: [
          { name: "vault", type: "address" },
          { name: "token0", type: "address" },
          { name: "token1", type: "address" },
          { name: "pool", type: "address" },
          { name: "stakingContract", type: "address" },
          { name: "presaleContract", type: "address" },
          { name: "sTokenAddress", type: "address" },
          { name: "deployer", type: "address" },
        ],
      },
    ],
    stateMutability: "view",
    type: "function",
  },
] as const;
