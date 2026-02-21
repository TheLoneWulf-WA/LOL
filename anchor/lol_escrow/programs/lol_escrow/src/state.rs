use anchor_lang::prelude::*;

#[account]
pub struct MatchAccount {
    pub creator: Pubkey,             // 32
    pub opponent: Pubkey,            // 32 (Pubkey::default() if empty)
    pub match_id: String,            // 4 + len (max 32)
    pub board_seed: u64,             // 8
    pub skr_wager: u64,              // 8 (raw token amount)
    pub creator_nft_mint: Pubkey,    // 32
    pub opponent_nft_mint: Pubkey,   // 32
    pub creator_score: Option<u32>,  // 1 + 4
    pub opponent_score: Option<u32>, // 1 + 4
    pub status: MatchStatus,         // 1
    pub bump: u8,                    // 1
}

impl MatchAccount {
    /// 8 (discriminator) + 32 + 32 + (4 + 32) + 8 + 8 + 32 + 32 + 5 + 5 + 1 + 1 = 200
    pub const MAX_SIZE: usize = 8 + 32 + 32 + (4 + 32) + 8 + 8 + 32 + 32 + 5 + 5 + 1 + 1;
    pub const MAX_MATCH_ID_LEN: usize = 32;
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone, Copy, PartialEq, Eq)]
pub enum MatchStatus {
    Waiting,   // Creator deposited, waiting for opponent
    Active,    // Both players joined, game in progress
    Settled,   // Both scores submitted, winner determined
    Cancelled, // Creator cancelled before opponent joined
}
