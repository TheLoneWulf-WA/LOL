use anchor_lang::prelude::*;

#[error_code]
pub enum LolError {
    #[msg("Match is not in the expected status")]
    InvalidMatchStatus,
    #[msg("Player has already submitted a score")]
    ScoreAlreadySubmitted,
    #[msg("Unauthorized player")]
    UnauthorizedPlayer,
    #[msg("Only the creator can cancel")]
    OnlyCreatorCanCancel,
    #[msg("Invalid SKR wager amount")]
    InvalidWager,
    #[msg("Match ID exceeds maximum length")]
    MatchIdTooLong,
}
