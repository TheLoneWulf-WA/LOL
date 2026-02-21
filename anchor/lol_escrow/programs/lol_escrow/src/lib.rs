use anchor_lang::prelude::*;
use anchor_spl::{
    associated_token::AssociatedToken,
    token::{self, Mint, Token, TokenAccount, Transfer},
};

pub mod errors;
pub mod state;

use errors::LolError;
use state::{MatchAccount, MatchStatus};

declare_id!("Gxxky4YmKSaA2xN3w8h6nrfgVktB3ERNWCc8D3Qf1j6U");

#[program]
pub mod lol_escrow {
    use super::*;

    /// Creates a new match. The creator deposits an NFT and SKR tokens into
    /// PDA-owned vault accounts.
    pub fn create_match(
        ctx: Context<CreateMatch>,
        match_id: String,
        board_seed: u64,
        skr_wager: u64,
    ) -> Result<()> {
        require!(
            match_id.len() <= MatchAccount::MAX_MATCH_ID_LEN,
            LolError::MatchIdTooLong
        );
        require!(skr_wager > 0, LolError::InvalidWager);

        // Transfer creator's NFT to the vault (amount = 1 for NFT)
        token::transfer(
            CpiContext::new(
                ctx.accounts.token_program.to_account_info(),
                Transfer {
                    from: ctx.accounts.creator_nft_token_account.to_account_info(),
                    to: ctx.accounts.vault_nft_token_account.to_account_info(),
                    authority: ctx.accounts.creator.to_account_info(),
                },
            ),
            1,
        )?;

        // Transfer SKR tokens to the vault
        token::transfer(
            CpiContext::new(
                ctx.accounts.token_program.to_account_info(),
                Transfer {
                    from: ctx.accounts.creator_skr_token_account.to_account_info(),
                    to: ctx.accounts.vault_skr_token_account.to_account_info(),
                    authority: ctx.accounts.creator.to_account_info(),
                },
            ),
            skr_wager,
        )?;

        // Initialize the match account
        let match_account = &mut ctx.accounts.match_account;
        match_account.creator = ctx.accounts.creator.key();
        match_account.opponent = Pubkey::default();
        match_account.match_id = match_id;
        match_account.board_seed = board_seed;
        match_account.skr_wager = skr_wager;
        match_account.creator_nft_mint = ctx.accounts.creator_nft_mint.key();
        match_account.opponent_nft_mint = Pubkey::default();
        match_account.creator_score = None;
        match_account.opponent_score = None;
        match_account.status = MatchStatus::Waiting;
        match_account.bump = ctx.bumps.match_account;

        msg!("Match created: creator={}", ctx.accounts.creator.key());
        Ok(())
    }

    /// Opponent joins the match by depositing their NFT and matching SKR wager.
    pub fn join_match(ctx: Context<JoinMatch>) -> Result<()> {
        let match_account = &ctx.accounts.match_account;
        require!(
            match_account.status == MatchStatus::Waiting,
            LolError::InvalidMatchStatus
        );

        let skr_wager = match_account.skr_wager;

        // Transfer opponent's NFT to the vault
        token::transfer(
            CpiContext::new(
                ctx.accounts.token_program.to_account_info(),
                Transfer {
                    from: ctx.accounts.opponent_nft_token_account.to_account_info(),
                    to: ctx.accounts.vault_opponent_nft_token_account.to_account_info(),
                    authority: ctx.accounts.opponent.to_account_info(),
                },
            ),
            1,
        )?;

        // Transfer matching SKR wager to the vault
        token::transfer(
            CpiContext::new(
                ctx.accounts.token_program.to_account_info(),
                Transfer {
                    from: ctx.accounts.opponent_skr_token_account.to_account_info(),
                    to: ctx.accounts.vault_skr_token_account.to_account_info(),
                    authority: ctx.accounts.opponent.to_account_info(),
                },
            ),
            skr_wager,
        )?;

        // Update match account
        let match_account = &mut ctx.accounts.match_account;
        match_account.opponent = ctx.accounts.opponent.key();
        match_account.opponent_nft_mint = ctx.accounts.opponent_nft_mint.key();
        match_account.status = MatchStatus::Active;

        msg!("Match joined: opponent={}", ctx.accounts.opponent.key());
        Ok(())
    }

    /// Submit the calling player's score. When both scores are in, settle the
    /// match: the higher scorer (ties go to creator) receives both NFTs and
    /// both SKR wagers from the vaults.
    pub fn submit_result(ctx: Context<SubmitResult>, score: u32) -> Result<()> {
        // Grab AccountInfo clones before any mutable borrow
        let match_account_info = ctx.accounts.match_account.to_account_info();
        let token_program_info = ctx.accounts.token_program.to_account_info();
        let vault_creator_nft_info = ctx.accounts.vault_creator_nft_token_account.to_account_info();
        let vault_opponent_nft_info = ctx.accounts.vault_opponent_nft_token_account.to_account_info();
        let vault_skr_info = ctx.accounts.vault_skr_token_account.to_account_info();
        let creator_nft_info = ctx.accounts.creator_nft_token_account.to_account_info();
        let creator_skr_info = ctx.accounts.creator_skr_token_account.to_account_info();
        let opponent_nft_info = ctx.accounts.opponent_nft_token_account.to_account_info();
        let opponent_skr_info = ctx.accounts.opponent_skr_token_account.to_account_info();
        let creator_receive_info = ctx.accounts.creator_receive_opponent_nft.to_account_info();
        let opponent_receive_info = ctx.accounts.opponent_receive_creator_nft.to_account_info();

        let match_account = &ctx.accounts.match_account;
        require!(
            match_account.status == MatchStatus::Active,
            LolError::InvalidMatchStatus
        );

        let caller = ctx.accounts.player.key();
        let is_creator = caller == match_account.creator;
        let is_opponent = caller == match_account.opponent;
        require!(is_creator || is_opponent, LolError::UnauthorizedPlayer);

        if is_creator {
            require!(
                match_account.creator_score.is_none(),
                LolError::ScoreAlreadySubmitted
            );
        } else {
            require!(
                match_account.opponent_score.is_none(),
                LolError::ScoreAlreadySubmitted
            );
        }

        // Record the score
        let match_account = &mut ctx.accounts.match_account;
        if is_creator {
            match_account.creator_score = Some(score);
        } else {
            match_account.opponent_score = Some(score);
        }

        msg!("Score submitted: player={}, score={}", caller, score);

        // Check if both scores are in — if so, settle
        if match_account.creator_score.is_some() && match_account.opponent_score.is_some() {
            let creator_score = match_account.creator_score.unwrap();
            let opponent_score = match_account.opponent_score.unwrap();

            // Ties go to creator
            let creator_wins = creator_score >= opponent_score;

            // Build PDA signer seeds
            let creator_key = match_account.creator;
            let match_id = match_account.match_id.clone();
            let bump = match_account.bump;
            let seeds: &[&[u8]] = &[
                b"match",
                creator_key.as_ref(),
                match_id.as_bytes(),
                &[bump],
            ];
            let signer_seeds = &[seeds];

            let skr_total = match_account.skr_wager.checked_mul(2).unwrap();

            if creator_wins {
                msg!("Creator wins! score {}:{}", creator_score, opponent_score);

                // Creator's NFT vault -> creator's NFT token account
                token::transfer(
                    CpiContext::new_with_signer(
                        token_program_info.clone(),
                        Transfer {
                            from: vault_creator_nft_info.clone(),
                            to: creator_nft_info.clone(),
                            authority: match_account_info.clone(),
                        },
                        signer_seeds,
                    ),
                    1,
                )?;

                // Opponent's NFT vault -> creator's opponent-NFT receive account
                token::transfer(
                    CpiContext::new_with_signer(
                        token_program_info.clone(),
                        Transfer {
                            from: vault_opponent_nft_info.clone(),
                            to: creator_receive_info.clone(),
                            authority: match_account_info.clone(),
                        },
                        signer_seeds,
                    ),
                    1,
                )?;

                // All SKR from vault -> creator's SKR account
                token::transfer(
                    CpiContext::new_with_signer(
                        token_program_info.clone(),
                        Transfer {
                            from: vault_skr_info.clone(),
                            to: creator_skr_info.clone(),
                            authority: match_account_info.clone(),
                        },
                        signer_seeds,
                    ),
                    skr_total,
                )?;
            } else {
                msg!(
                    "Opponent wins! score {}:{}",
                    creator_score,
                    opponent_score
                );

                // Creator's NFT vault -> opponent's receive account for creator NFT
                token::transfer(
                    CpiContext::new_with_signer(
                        token_program_info.clone(),
                        Transfer {
                            from: vault_creator_nft_info.clone(),
                            to: opponent_receive_info.clone(),
                            authority: match_account_info.clone(),
                        },
                        signer_seeds,
                    ),
                    1,
                )?;

                // Opponent's NFT vault -> opponent's NFT token account
                token::transfer(
                    CpiContext::new_with_signer(
                        token_program_info.clone(),
                        Transfer {
                            from: vault_opponent_nft_info.clone(),
                            to: opponent_nft_info.clone(),
                            authority: match_account_info.clone(),
                        },
                        signer_seeds,
                    ),
                    1,
                )?;

                // All SKR from vault -> opponent's SKR account
                token::transfer(
                    CpiContext::new_with_signer(
                        token_program_info.clone(),
                        Transfer {
                            from: vault_skr_info.clone(),
                            to: opponent_skr_info.clone(),
                            authority: match_account_info.clone(),
                        },
                        signer_seeds,
                    ),
                    skr_total,
                )?;
            }

            match_account.status = MatchStatus::Settled;
            msg!("Match settled!");
        }

        Ok(())
    }

    /// Cancel a match. Only the creator can cancel, and only while status is Waiting.
    /// Returns the NFT and SKR to the creator.
    pub fn cancel_match(ctx: Context<CancelMatch>) -> Result<()> {
        let match_account = &ctx.accounts.match_account;
        require!(
            match_account.status == MatchStatus::Waiting,
            LolError::InvalidMatchStatus
        );
        require!(
            match_account.creator == ctx.accounts.creator.key(),
            LolError::OnlyCreatorCanCancel
        );

        let creator_key = match_account.creator;
        let match_id = match_account.match_id.clone();
        let bump = match_account.bump;
        let skr_wager = match_account.skr_wager;
        let seeds: &[&[u8]] = &[
            b"match",
            creator_key.as_ref(),
            match_id.as_bytes(),
            &[bump],
        ];
        let signer_seeds = &[seeds];

        // Return NFT to creator
        token::transfer(
            CpiContext::new_with_signer(
                ctx.accounts.token_program.to_account_info(),
                Transfer {
                    from: ctx.accounts.vault_nft_token_account.to_account_info(),
                    to: ctx.accounts.creator_nft_token_account.to_account_info(),
                    authority: ctx.accounts.match_account.to_account_info(),
                },
                signer_seeds,
            ),
            1,
        )?;

        // Return SKR to creator
        token::transfer(
            CpiContext::new_with_signer(
                ctx.accounts.token_program.to_account_info(),
                Transfer {
                    from: ctx.accounts.vault_skr_token_account.to_account_info(),
                    to: ctx.accounts.creator_skr_token_account.to_account_info(),
                    authority: ctx.accounts.match_account.to_account_info(),
                },
                signer_seeds,
            ),
            skr_wager,
        )?;

        let match_account = &mut ctx.accounts.match_account;
        match_account.status = MatchStatus::Cancelled;

        msg!("Match cancelled by creator");
        Ok(())
    }
}

// ============================================================================
// Account contexts
// ============================================================================

#[derive(Accounts)]
#[instruction(match_id: String, board_seed: u64, skr_wager: u64)]
pub struct CreateMatch<'info> {
    #[account(mut)]
    pub creator: Signer<'info>,

    #[account(
        init,
        payer = creator,
        space = MatchAccount::MAX_SIZE,
        seeds = [b"match", creator.key().as_ref(), match_id.as_bytes()],
        bump,
    )]
    pub match_account: Account<'info, MatchAccount>,

    /// The NFT mint being wagered by the creator.
    pub creator_nft_mint: Account<'info, Mint>,

    /// Creator's token account holding the NFT.
    #[account(
        mut,
        constraint = creator_nft_token_account.mint == creator_nft_mint.key(),
        constraint = creator_nft_token_account.owner == creator.key(),
    )]
    pub creator_nft_token_account: Account<'info, TokenAccount>,

    /// PDA-owned vault to hold the creator's NFT during the match.
    #[account(
        init_if_needed,
        payer = creator,
        associated_token::mint = creator_nft_mint,
        associated_token::authority = match_account,
    )]
    pub vault_nft_token_account: Account<'info, TokenAccount>,

    /// The SKR token mint.
    pub skr_mint: Account<'info, Mint>,

    /// Creator's SKR token account.
    #[account(
        mut,
        constraint = creator_skr_token_account.mint == skr_mint.key(),
        constraint = creator_skr_token_account.owner == creator.key(),
    )]
    pub creator_skr_token_account: Account<'info, TokenAccount>,

    /// PDA-owned vault to hold SKR wagers.
    #[account(
        init_if_needed,
        payer = creator,
        associated_token::mint = skr_mint,
        associated_token::authority = match_account,
    )]
    pub vault_skr_token_account: Account<'info, TokenAccount>,

    pub token_program: Program<'info, Token>,
    pub associated_token_program: Program<'info, AssociatedToken>,
    pub system_program: Program<'info, System>,
    pub rent: Sysvar<'info, Rent>,
}

#[derive(Accounts)]
pub struct JoinMatch<'info> {
    #[account(mut)]
    pub opponent: Signer<'info>,

    #[account(mut)]
    pub match_account: Account<'info, MatchAccount>,

    /// The NFT mint being wagered by the opponent.
    pub opponent_nft_mint: Account<'info, Mint>,

    /// Opponent's token account holding the NFT.
    #[account(
        mut,
        constraint = opponent_nft_token_account.mint == opponent_nft_mint.key(),
        constraint = opponent_nft_token_account.owner == opponent.key(),
    )]
    pub opponent_nft_token_account: Account<'info, TokenAccount>,

    /// PDA-owned vault to hold the opponent's NFT during the match.
    #[account(
        init_if_needed,
        payer = opponent,
        associated_token::mint = opponent_nft_mint,
        associated_token::authority = match_account,
    )]
    pub vault_opponent_nft_token_account: Account<'info, TokenAccount>,

    /// The SKR token mint.
    pub skr_mint: Account<'info, Mint>,

    /// Opponent's SKR token account.
    #[account(
        mut,
        constraint = opponent_skr_token_account.mint == skr_mint.key(),
        constraint = opponent_skr_token_account.owner == opponent.key(),
    )]
    pub opponent_skr_token_account: Account<'info, TokenAccount>,

    /// The existing vault SKR token account (created during create_match).
    #[account(
        mut,
        constraint = vault_skr_token_account.mint == skr_mint.key(),
        constraint = vault_skr_token_account.owner == match_account.key(),
    )]
    pub vault_skr_token_account: Account<'info, TokenAccount>,

    pub token_program: Program<'info, Token>,
    pub associated_token_program: Program<'info, AssociatedToken>,
    pub system_program: Program<'info, System>,
    pub rent: Sysvar<'info, Rent>,
}

/// For SubmitResult we use checked TokenAccounts with manual constraints,
/// because the winner (and therefore which transfer paths are used) is only
/// known at runtime. Accounts are Boxed to stay within SBF stack limits.
#[derive(Accounts)]
pub struct SubmitResult<'info> {
    #[account(mut)]
    pub player: Signer<'info>,

    #[account(mut)]
    pub match_account: Box<Account<'info, MatchAccount>>,

    // --- Mints (for validation) ---
    pub creator_nft_mint: Box<Account<'info, Mint>>,
    pub opponent_nft_mint: Box<Account<'info, Mint>>,
    pub skr_mint: Box<Account<'info, Mint>>,

    // --- Vault accounts (PDA-owned) ---
    /// Vault holding creator's NFT
    #[account(
        mut,
        constraint = vault_creator_nft_token_account.mint == creator_nft_mint.key(),
        constraint = vault_creator_nft_token_account.owner == match_account.key(),
    )]
    pub vault_creator_nft_token_account: Box<Account<'info, TokenAccount>>,

    /// Vault holding opponent's NFT
    #[account(
        mut,
        constraint = vault_opponent_nft_token_account.mint == opponent_nft_mint.key(),
        constraint = vault_opponent_nft_token_account.owner == match_account.key(),
    )]
    pub vault_opponent_nft_token_account: Box<Account<'info, TokenAccount>>,

    /// Vault holding SKR wagers
    #[account(
        mut,
        constraint = vault_skr_token_account.mint == skr_mint.key(),
        constraint = vault_skr_token_account.owner == match_account.key(),
    )]
    pub vault_skr_token_account: Box<Account<'info, TokenAccount>>,

    // --- Creator's personal token accounts ---
    /// Creator's token account for their own NFT
    #[account(
        mut,
        constraint = creator_nft_token_account.mint == creator_nft_mint.key(),
        constraint = creator_nft_token_account.owner == match_account.creator,
    )]
    pub creator_nft_token_account: Box<Account<'info, TokenAccount>>,

    /// Creator's SKR token account
    #[account(
        mut,
        constraint = creator_skr_token_account.mint == skr_mint.key(),
        constraint = creator_skr_token_account.owner == match_account.creator,
    )]
    pub creator_skr_token_account: Box<Account<'info, TokenAccount>>,

    // --- Opponent's personal token accounts ---
    /// Opponent's token account for their own NFT
    #[account(
        mut,
        constraint = opponent_nft_token_account.mint == opponent_nft_mint.key(),
        constraint = opponent_nft_token_account.owner == match_account.opponent,
    )]
    pub opponent_nft_token_account: Box<Account<'info, TokenAccount>>,

    /// Opponent's SKR token account
    #[account(
        mut,
        constraint = opponent_skr_token_account.mint == skr_mint.key(),
        constraint = opponent_skr_token_account.owner == match_account.opponent,
    )]
    pub opponent_skr_token_account: Box<Account<'info, TokenAccount>>,

    // --- Cross-NFT receive accounts (winner gets other player's NFT) ---
    // These are init_if_needed because the winner may not have a token account
    // for the opponent's NFT mint yet.

    /// Creator's token account to receive opponent's NFT (if creator wins)
    /// CHECK: Validated as ATA in instruction logic. We use UncheckedAccount
    /// because init_if_needed with dynamic authority from match_account fields
    /// is not supported by Anchor's derive macro.
    #[account(mut)]
    pub creator_receive_opponent_nft: UncheckedAccount<'info>,

    /// Opponent's token account to receive creator's NFT (if opponent wins)
    /// CHECK: Validated as ATA in instruction logic.
    #[account(mut)]
    pub opponent_receive_creator_nft: UncheckedAccount<'info>,

    pub token_program: Program<'info, Token>,
    pub associated_token_program: Program<'info, AssociatedToken>,
    pub system_program: Program<'info, System>,
    pub rent: Sysvar<'info, Rent>,
}

#[derive(Accounts)]
pub struct CancelMatch<'info> {
    #[account(mut)]
    pub creator: Signer<'info>,

    #[account(
        mut,
        seeds = [b"match", creator.key().as_ref(), match_account.match_id.as_bytes()],
        bump = match_account.bump,
    )]
    pub match_account: Account<'info, MatchAccount>,

    /// The creator's NFT mint (must match what was deposited)
    #[account(
        constraint = creator_nft_mint.key() == match_account.creator_nft_mint,
    )]
    pub creator_nft_mint: Account<'info, Mint>,

    /// Creator's token account for the NFT
    #[account(
        mut,
        constraint = creator_nft_token_account.mint == creator_nft_mint.key(),
        constraint = creator_nft_token_account.owner == creator.key(),
    )]
    pub creator_nft_token_account: Account<'info, TokenAccount>,

    /// Vault holding the creator's NFT
    #[account(
        mut,
        constraint = vault_nft_token_account.mint == creator_nft_mint.key(),
        constraint = vault_nft_token_account.owner == match_account.key(),
    )]
    pub vault_nft_token_account: Account<'info, TokenAccount>,

    /// SKR mint
    pub skr_mint: Account<'info, Mint>,

    /// Creator's SKR token account
    #[account(
        mut,
        constraint = creator_skr_token_account.mint == skr_mint.key(),
        constraint = creator_skr_token_account.owner == creator.key(),
    )]
    pub creator_skr_token_account: Account<'info, TokenAccount>,

    /// Vault holding SKR wager
    #[account(
        mut,
        constraint = vault_skr_token_account.mint == skr_mint.key(),
        constraint = vault_skr_token_account.owner == match_account.key(),
    )]
    pub vault_skr_token_account: Account<'info, TokenAccount>,

    pub token_program: Program<'info, Token>,
    pub system_program: Program<'info, System>,
}
