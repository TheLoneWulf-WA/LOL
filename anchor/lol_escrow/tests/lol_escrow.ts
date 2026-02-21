import * as anchor from "@coral-xyz/anchor";
import { Program, BN } from "@coral-xyz/anchor";
import { LolEscrow } from "../target/types/lol_escrow";
import {
  Keypair,
  PublicKey,
  SystemProgram,
  SYSVAR_RENT_PUBKEY,
} from "@solana/web3.js";
import {
  TOKEN_PROGRAM_ID,
  ASSOCIATED_TOKEN_PROGRAM_ID,
  createMint,
  createAssociatedTokenAccount,
  mintTo,
  getAccount,
  getAssociatedTokenAddressSync,
} from "@solana/spl-token";
import { expect } from "chai";

describe("lol_escrow", () => {
  const provider = anchor.AnchorProvider.env();
  anchor.setProvider(provider);

  const program = anchor.workspace.lolEscrow as Program<LolEscrow>;
  const payer = (provider.wallet as anchor.Wallet).payer;

  // Shared state across tests
  let skrMint: PublicKey;
  let creatorNftMint: PublicKey;
  let opponentNftMint: PublicKey;

  const creator = Keypair.generate();
  const opponent = Keypair.generate();

  const MATCH_ID = "test-match-001";
  const BOARD_SEED = new BN(123456);
  const SKR_WAGER = new BN(1_000_000_000); // 1 SKR with 9 decimals

  // Helper: airdrop SOL to a keypair
  async function airdrop(pubkey: PublicKey, amount = 10_000_000_000) {
    const sig = await provider.connection.requestAirdrop(pubkey, amount);
    const latestBlockhash = await provider.connection.getLatestBlockhash();
    await provider.connection.confirmTransaction({
      signature: sig,
      ...latestBlockhash,
    });
  }

  // Helper: derive match PDA
  function deriveMatchPda(
    creatorKey: PublicKey,
    matchId: string
  ): [PublicKey, number] {
    return PublicKey.findProgramAddressSync(
      [
        Buffer.from("match"),
        creatorKey.toBuffer(),
        Buffer.from(matchId),
      ],
      program.programId
    );
  }

  before(async () => {
    // Fund creator and opponent
    await airdrop(creator.publicKey);
    await airdrop(opponent.publicKey);

    // Create SKR mint (9 decimals)
    skrMint = await createMint(
      provider.connection,
      payer,
      payer.publicKey, // mint authority
      null,
      9
    );

    // Create creator NFT mint (0 decimals, supply = 1)
    creatorNftMint = await createMint(
      provider.connection,
      payer,
      payer.publicKey,
      null,
      0
    );

    // Create opponent NFT mint (0 decimals, supply = 1)
    opponentNftMint = await createMint(
      provider.connection,
      payer,
      payer.publicKey,
      null,
      0
    );

    // Create ATAs and mint tokens to creator
    const creatorNftAta = await createAssociatedTokenAccount(
      provider.connection,
      payer,
      creatorNftMint,
      creator.publicKey
    );
    await mintTo(
      provider.connection,
      payer,
      creatorNftMint,
      creatorNftAta,
      payer,
      1
    );

    const creatorSkrAta = await createAssociatedTokenAccount(
      provider.connection,
      payer,
      skrMint,
      creator.publicKey
    );
    await mintTo(
      provider.connection,
      payer,
      skrMint,
      creatorSkrAta,
      payer,
      SKR_WAGER.toNumber() * 2 // extra for tests
    );

    // Create ATAs and mint tokens to opponent
    const opponentNftAta = await createAssociatedTokenAccount(
      provider.connection,
      payer,
      opponentNftMint,
      opponent.publicKey
    );
    await mintTo(
      provider.connection,
      payer,
      opponentNftMint,
      opponentNftAta,
      payer,
      1
    );

    const opponentSkrAta = await createAssociatedTokenAccount(
      provider.connection,
      payer,
      skrMint,
      opponent.publicKey
    );
    await mintTo(
      provider.connection,
      payer,
      skrMint,
      opponentSkrAta,
      payer,
      SKR_WAGER.toNumber() * 2
    );
  });

  // =========================================================================
  // Test 1: Create a match
  // =========================================================================
  it("Creates a match - deposits NFT and SKR into vaults", async () => {
    const [matchPda] = deriveMatchPda(creator.publicKey, MATCH_ID);

    const creatorNftAta = getAssociatedTokenAddressSync(
      creatorNftMint,
      creator.publicKey
    );
    const vaultNftAta = getAssociatedTokenAddressSync(
      creatorNftMint,
      matchPda,
      true // allowOwnerOffCurve for PDA
    );
    const creatorSkrAta = getAssociatedTokenAddressSync(
      skrMint,
      creator.publicKey
    );
    const vaultSkrAta = getAssociatedTokenAddressSync(
      skrMint,
      matchPda,
      true
    );

    await program.methods
      .createMatch(MATCH_ID, BOARD_SEED, SKR_WAGER)
      .accounts({
        creator: creator.publicKey,
        matchAccount: matchPda,
        creatorNftMint: creatorNftMint,
        creatorNftTokenAccount: creatorNftAta,
        vaultNftTokenAccount: vaultNftAta,
        skrMint: skrMint,
        creatorSkrTokenAccount: creatorSkrAta,
        vaultSkrTokenAccount: vaultSkrAta,
        tokenProgram: TOKEN_PROGRAM_ID,
        associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
        systemProgram: SystemProgram.programId,
        rent: SYSVAR_RENT_PUBKEY,
      })
      .signers([creator])
      .rpc();

    // Verify match account
    const matchAccount = await program.account.matchAccount.fetch(matchPda);
    expect(matchAccount.creator.toBase58()).to.equal(
      creator.publicKey.toBase58()
    );
    expect(matchAccount.matchId).to.equal(MATCH_ID);
    expect(matchAccount.boardSeed.toNumber()).to.equal(BOARD_SEED.toNumber());
    expect(matchAccount.skrWager.toNumber()).to.equal(SKR_WAGER.toNumber());
    expect(matchAccount.creatorNftMint.toBase58()).to.equal(
      creatorNftMint.toBase58()
    );
    expect(matchAccount.opponent.toBase58()).to.equal(
      PublicKey.default.toBase58()
    );
    expect(matchAccount.creatorScore).to.be.null;
    expect(matchAccount.opponentScore).to.be.null;
    expect(JSON.stringify(matchAccount.status)).to.equal(
      JSON.stringify({ waiting: {} })
    );

    // Verify vault has the NFT
    const vaultNftAccount = await getAccount(provider.connection, vaultNftAta);
    expect(Number(vaultNftAccount.amount)).to.equal(1);

    // Verify vault has SKR
    const vaultSkrAccount = await getAccount(provider.connection, vaultSkrAta);
    expect(Number(vaultSkrAccount.amount)).to.equal(SKR_WAGER.toNumber());

    // Verify creator's NFT is gone
    const creatorNftAccount = await getAccount(
      provider.connection,
      creatorNftAta
    );
    expect(Number(creatorNftAccount.amount)).to.equal(0);
  });

  // =========================================================================
  // Test 2: Join a match
  // =========================================================================
  it("Opponent joins the match - deposits NFT and SKR", async () => {
    const [matchPda] = deriveMatchPda(creator.publicKey, MATCH_ID);

    const opponentNftAta = getAssociatedTokenAddressSync(
      opponentNftMint,
      opponent.publicKey
    );
    const vaultOpponentNftAta = getAssociatedTokenAddressSync(
      opponentNftMint,
      matchPda,
      true
    );
    const opponentSkrAta = getAssociatedTokenAddressSync(
      skrMint,
      opponent.publicKey
    );
    const vaultSkrAta = getAssociatedTokenAddressSync(
      skrMint,
      matchPda,
      true
    );

    await program.methods
      .joinMatch()
      .accounts({
        opponent: opponent.publicKey,
        matchAccount: matchPda,
        opponentNftMint: opponentNftMint,
        opponentNftTokenAccount: opponentNftAta,
        vaultOpponentNftTokenAccount: vaultOpponentNftAta,
        skrMint: skrMint,
        opponentSkrTokenAccount: opponentSkrAta,
        vaultSkrTokenAccount: vaultSkrAta,
        tokenProgram: TOKEN_PROGRAM_ID,
        associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
        systemProgram: SystemProgram.programId,
        rent: SYSVAR_RENT_PUBKEY,
      })
      .signers([opponent])
      .rpc();

    // Verify match account updated
    const matchAccount = await program.account.matchAccount.fetch(matchPda);
    expect(matchAccount.opponent.toBase58()).to.equal(
      opponent.publicKey.toBase58()
    );
    expect(matchAccount.opponentNftMint.toBase58()).to.equal(
      opponentNftMint.toBase58()
    );
    expect(JSON.stringify(matchAccount.status)).to.equal(
      JSON.stringify({ active: {} })
    );

    // Verify vault has opponent's NFT
    const vaultNftAccount = await getAccount(
      provider.connection,
      vaultOpponentNftAta
    );
    expect(Number(vaultNftAccount.amount)).to.equal(1);

    // Verify vault has 2x SKR wager
    const vaultSkrAccount = await getAccount(
      provider.connection,
      vaultSkrAta
    );
    expect(Number(vaultSkrAccount.amount)).to.equal(SKR_WAGER.toNumber() * 2);
  });

  // =========================================================================
  // Test 3: Submit scores - creator wins (higher score)
  // =========================================================================
  it("Submits scores and settles - creator wins", async () => {
    const [matchPda] = deriveMatchPda(creator.publicKey, MATCH_ID);

    const creatorNftAta = getAssociatedTokenAddressSync(
      creatorNftMint,
      creator.publicKey
    );
    const opponentNftAta = getAssociatedTokenAddressSync(
      opponentNftMint,
      opponent.publicKey
    );
    const creatorSkrAta = getAssociatedTokenAddressSync(
      skrMint,
      creator.publicKey
    );
    const opponentSkrAta = getAssociatedTokenAddressSync(
      skrMint,
      opponent.publicKey
    );
    const vaultCreatorNftAta = getAssociatedTokenAddressSync(
      creatorNftMint,
      matchPda,
      true
    );
    const vaultOpponentNftAta = getAssociatedTokenAddressSync(
      opponentNftMint,
      matchPda,
      true
    );
    const vaultSkrAta = getAssociatedTokenAddressSync(
      skrMint,
      matchPda,
      true
    );

    // Creator's receive account for opponent's NFT (ATA)
    const creatorReceiveOpponentNft = getAssociatedTokenAddressSync(
      opponentNftMint,
      creator.publicKey
    );
    // Opponent's receive account for creator's NFT (ATA)
    const opponentReceiveCreatorNft = getAssociatedTokenAddressSync(
      creatorNftMint,
      opponent.publicKey
    );

    // Pre-create the receive ATAs since our program uses UncheckedAccount
    await createAssociatedTokenAccount(
      provider.connection,
      payer,
      opponentNftMint,
      creator.publicKey
    );
    await createAssociatedTokenAccount(
      provider.connection,
      payer,
      creatorNftMint,
      opponent.publicKey
    );

    const submitAccounts = {
      player: creator.publicKey,
      matchAccount: matchPda,
      creatorNftMint: creatorNftMint,
      opponentNftMint: opponentNftMint,
      skrMint: skrMint,
      vaultCreatorNftTokenAccount: vaultCreatorNftAta,
      vaultOpponentNftTokenAccount: vaultOpponentNftAta,
      vaultSkrTokenAccount: vaultSkrAta,
      creatorNftTokenAccount: creatorNftAta,
      creatorSkrTokenAccount: creatorSkrAta,
      opponentNftTokenAccount: opponentNftAta,
      opponentSkrTokenAccount: opponentSkrAta,
      creatorReceiveOpponentNft: creatorReceiveOpponentNft,
      opponentReceiveCreatorNft: opponentReceiveCreatorNft,
      tokenProgram: TOKEN_PROGRAM_ID,
      associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
      systemProgram: SystemProgram.programId,
      rent: SYSVAR_RENT_PUBKEY,
    };

    // Creator submits score = 100
    await program.methods
      .submitResult(100)
      .accounts({ ...submitAccounts, player: creator.publicKey })
      .signers([creator])
      .rpc();

    // Verify only creator score is set, match still active
    let matchAccount = await program.account.matchAccount.fetch(matchPda);
    expect(matchAccount.creatorScore).to.equal(100);
    expect(matchAccount.opponentScore).to.be.null;
    expect(JSON.stringify(matchAccount.status)).to.equal(
      JSON.stringify({ active: {} })
    );

    // Opponent submits score = 80 (lower, so creator wins)
    await program.methods
      .submitResult(80)
      .accounts({ ...submitAccounts, player: opponent.publicKey })
      .signers([opponent])
      .rpc();

    // Verify match is settled
    matchAccount = await program.account.matchAccount.fetch(matchPda);
    expect(matchAccount.creatorScore).to.equal(100);
    expect(matchAccount.opponentScore).to.equal(80);
    expect(JSON.stringify(matchAccount.status)).to.equal(
      JSON.stringify({ settled: {} })
    );

    // Creator should have both NFTs and all SKR
    const creatorNftAccount = await getAccount(
      provider.connection,
      creatorNftAta
    );
    expect(Number(creatorNftAccount.amount)).to.equal(1);

    const creatorOpponentNftAccount = await getAccount(
      provider.connection,
      creatorReceiveOpponentNft
    );
    expect(Number(creatorOpponentNftAccount.amount)).to.equal(1);

    const creatorSkrAccount = await getAccount(
      provider.connection,
      creatorSkrAta
    );
    // Creator started with 2*wager, deposited 1*wager, won 2*wager back = 3*wager
    expect(Number(creatorSkrAccount.amount)).to.equal(
      SKR_WAGER.toNumber() * 3
    );

    // Vaults should be empty
    const vaultSkrAccount = await getAccount(
      provider.connection,
      vaultSkrAta
    );
    expect(Number(vaultSkrAccount.amount)).to.equal(0);
  });

  // =========================================================================
  // Test 4: Cancel a match
  // =========================================================================
  it("Creator cancels a waiting match - gets NFT and SKR back", async () => {
    const CANCEL_MATCH_ID = "cancel-test-001";

    // Create a new NFT mint for this test
    const cancelNftMint = await createMint(
      provider.connection,
      payer,
      payer.publicKey,
      null,
      0
    );

    const creatorCancelNftAta = await createAssociatedTokenAccount(
      provider.connection,
      payer,
      cancelNftMint,
      creator.publicKey
    );
    await mintTo(
      provider.connection,
      payer,
      cancelNftMint,
      creatorCancelNftAta,
      payer,
      1
    );

    const [cancelMatchPda] = deriveMatchPda(
      creator.publicKey,
      CANCEL_MATCH_ID
    );

    const vaultNftAta = getAssociatedTokenAddressSync(
      cancelNftMint,
      cancelMatchPda,
      true
    );
    const creatorSkrAta = getAssociatedTokenAddressSync(
      skrMint,
      creator.publicKey
    );
    const vaultSkrAta = getAssociatedTokenAddressSync(
      skrMint,
      cancelMatchPda,
      true
    );

    // Record SKR balance before
    const skrBefore = Number(
      (await getAccount(provider.connection, creatorSkrAta)).amount
    );

    // Create the match
    await program.methods
      .createMatch(CANCEL_MATCH_ID, BOARD_SEED, SKR_WAGER)
      .accounts({
        creator: creator.publicKey,
        matchAccount: cancelMatchPda,
        creatorNftMint: cancelNftMint,
        creatorNftTokenAccount: creatorCancelNftAta,
        vaultNftTokenAccount: vaultNftAta,
        skrMint: skrMint,
        creatorSkrTokenAccount: creatorSkrAta,
        vaultSkrTokenAccount: vaultSkrAta,
        tokenProgram: TOKEN_PROGRAM_ID,
        associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
        systemProgram: SystemProgram.programId,
        rent: SYSVAR_RENT_PUBKEY,
      })
      .signers([creator])
      .rpc();

    // Verify NFT is in vault
    let creatorNft = await getAccount(
      provider.connection,
      creatorCancelNftAta
    );
    expect(Number(creatorNft.amount)).to.equal(0);

    // Cancel the match
    await program.methods
      .cancelMatch()
      .accounts({
        creator: creator.publicKey,
        matchAccount: cancelMatchPda,
        creatorNftMint: cancelNftMint,
        creatorNftTokenAccount: creatorCancelNftAta,
        vaultNftTokenAccount: vaultNftAta,
        skrMint: skrMint,
        creatorSkrTokenAccount: creatorSkrAta,
        vaultSkrTokenAccount: vaultSkrAta,
        tokenProgram: TOKEN_PROGRAM_ID,
        systemProgram: SystemProgram.programId,
      })
      .signers([creator])
      .rpc();

    // Verify match status = Cancelled
    const matchAccount = await program.account.matchAccount.fetch(
      cancelMatchPda
    );
    expect(JSON.stringify(matchAccount.status)).to.equal(
      JSON.stringify({ cancelled: {} })
    );

    // Verify creator got NFT back
    creatorNft = await getAccount(provider.connection, creatorCancelNftAta);
    expect(Number(creatorNft.amount)).to.equal(1);

    // Verify creator got SKR back
    const skrAfter = Number(
      (await getAccount(provider.connection, creatorSkrAta)).amount
    );
    expect(skrAfter).to.equal(skrBefore);
  });

  // =========================================================================
  // Test 5: Error - can't join an already active match
  // =========================================================================
  it("Error: cannot join an already active match", async () => {
    // The first match (MATCH_ID) is already Active/Settled
    const [matchPda] = deriveMatchPda(creator.publicKey, MATCH_ID);

    // Create a third player
    const thirdPlayer = Keypair.generate();
    await airdrop(thirdPlayer.publicKey);

    const thirdNftMint = await createMint(
      provider.connection,
      payer,
      payer.publicKey,
      null,
      0
    );
    const thirdNftAta = await createAssociatedTokenAccount(
      provider.connection,
      payer,
      thirdNftMint,
      thirdPlayer.publicKey
    );
    await mintTo(
      provider.connection,
      payer,
      thirdNftMint,
      thirdNftAta,
      payer,
      1
    );

    const thirdSkrAta = await createAssociatedTokenAccount(
      provider.connection,
      payer,
      skrMint,
      thirdPlayer.publicKey
    );
    await mintTo(
      provider.connection,
      payer,
      skrMint,
      thirdSkrAta,
      payer,
      SKR_WAGER.toNumber()
    );

    const vaultThirdNftAta = getAssociatedTokenAddressSync(
      thirdNftMint,
      matchPda,
      true
    );
    const vaultSkrAta = getAssociatedTokenAddressSync(
      skrMint,
      matchPda,
      true
    );

    try {
      await program.methods
        .joinMatch()
        .accounts({
          opponent: thirdPlayer.publicKey,
          matchAccount: matchPda,
          opponentNftMint: thirdNftMint,
          opponentNftTokenAccount: thirdNftAta,
          vaultOpponentNftTokenAccount: vaultThirdNftAta,
          skrMint: skrMint,
          opponentSkrTokenAccount: thirdSkrAta,
          vaultSkrTokenAccount: vaultSkrAta,
          tokenProgram: TOKEN_PROGRAM_ID,
          associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
          systemProgram: SystemProgram.programId,
          rent: SYSVAR_RENT_PUBKEY,
        })
        .signers([thirdPlayer])
        .rpc();
      expect.fail("Should have thrown an error");
    } catch (err: any) {
      // The match is Settled, so the status constraint or in-instruction check should fail
      expect(err.toString()).to.contain("InvalidMatchStatus");
    }
  });

  // =========================================================================
  // Test 6: Error - can't cancel an active match
  // =========================================================================
  it("Error: cannot cancel an active match", async () => {
    // Create a fresh match and join it
    const ACTIVE_MATCH_ID = "active-cancel-test";

    const activeNftMint = await createMint(
      provider.connection,
      payer,
      payer.publicKey,
      null,
      0
    );
    const activeNftAta = await createAssociatedTokenAccount(
      provider.connection,
      payer,
      activeNftMint,
      creator.publicKey
    );
    await mintTo(
      provider.connection,
      payer,
      activeNftMint,
      activeNftAta,
      payer,
      1
    );

    const oppNftMint2 = await createMint(
      provider.connection,
      payer,
      payer.publicKey,
      null,
      0
    );
    const oppNftAta2 = await createAssociatedTokenAccount(
      provider.connection,
      payer,
      oppNftMint2,
      opponent.publicKey
    );
    await mintTo(
      provider.connection,
      payer,
      oppNftMint2,
      oppNftAta2,
      payer,
      1
    );

    // Mint more SKR for both players
    const creatorSkrAta = getAssociatedTokenAddressSync(
      skrMint,
      creator.publicKey
    );
    const opponentSkrAta = getAssociatedTokenAddressSync(
      skrMint,
      opponent.publicKey
    );
    await mintTo(
      provider.connection,
      payer,
      skrMint,
      creatorSkrAta,
      payer,
      SKR_WAGER.toNumber()
    );
    await mintTo(
      provider.connection,
      payer,
      skrMint,
      opponentSkrAta,
      payer,
      SKR_WAGER.toNumber()
    );

    const [activeMatchPda] = deriveMatchPda(
      creator.publicKey,
      ACTIVE_MATCH_ID
    );
    const vaultActiveNftAta = getAssociatedTokenAddressSync(
      activeNftMint,
      activeMatchPda,
      true
    );
    const vaultSkrAta = getAssociatedTokenAddressSync(
      skrMint,
      activeMatchPda,
      true
    );

    // Create match
    await program.methods
      .createMatch(ACTIVE_MATCH_ID, BOARD_SEED, SKR_WAGER)
      .accounts({
        creator: creator.publicKey,
        matchAccount: activeMatchPda,
        creatorNftMint: activeNftMint,
        creatorNftTokenAccount: activeNftAta,
        vaultNftTokenAccount: vaultActiveNftAta,
        skrMint: skrMint,
        creatorSkrTokenAccount: creatorSkrAta,
        vaultSkrTokenAccount: vaultSkrAta,
        tokenProgram: TOKEN_PROGRAM_ID,
        associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
        systemProgram: SystemProgram.programId,
        rent: SYSVAR_RENT_PUBKEY,
      })
      .signers([creator])
      .rpc();

    // Join match
    const vaultOppNftAta = getAssociatedTokenAddressSync(
      oppNftMint2,
      activeMatchPda,
      true
    );
    await program.methods
      .joinMatch()
      .accounts({
        opponent: opponent.publicKey,
        matchAccount: activeMatchPda,
        opponentNftMint: oppNftMint2,
        opponentNftTokenAccount: oppNftAta2,
        vaultOpponentNftTokenAccount: vaultOppNftAta,
        skrMint: skrMint,
        opponentSkrTokenAccount: opponentSkrAta,
        vaultSkrTokenAccount: vaultSkrAta,
        tokenProgram: TOKEN_PROGRAM_ID,
        associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
        systemProgram: SystemProgram.programId,
        rent: SYSVAR_RENT_PUBKEY,
      })
      .signers([opponent])
      .rpc();

    // Now try to cancel the active match
    try {
      await program.methods
        .cancelMatch()
        .accounts({
          creator: creator.publicKey,
          matchAccount: activeMatchPda,
          creatorNftMint: activeNftMint,
          creatorNftTokenAccount: activeNftAta,
          vaultNftTokenAccount: vaultActiveNftAta,
          skrMint: skrMint,
          creatorSkrTokenAccount: creatorSkrAta,
          vaultSkrTokenAccount: vaultSkrAta,
          tokenProgram: TOKEN_PROGRAM_ID,
          systemProgram: SystemProgram.programId,
        })
        .signers([creator])
        .rpc();
      expect.fail("Should have thrown an error");
    } catch (err: any) {
      expect(err.toString()).to.contain("InvalidMatchStatus");
    }
  });

  // =========================================================================
  // Test 7: Error - can't submit score twice
  // =========================================================================
  it("Error: cannot submit score twice", async () => {
    // Create a fresh match for this test
    const DOUBLE_SUBMIT_ID = "double-submit-test";

    const dsNftMint = await createMint(
      provider.connection,
      payer,
      payer.publicKey,
      null,
      0
    );
    const dsNftAta = await createAssociatedTokenAccount(
      provider.connection,
      payer,
      dsNftMint,
      creator.publicKey
    );
    await mintTo(
      provider.connection,
      payer,
      dsNftMint,
      dsNftAta,
      payer,
      1
    );

    const dsOppNftMint = await createMint(
      provider.connection,
      payer,
      payer.publicKey,
      null,
      0
    );
    const dsOppNftAta = await createAssociatedTokenAccount(
      provider.connection,
      payer,
      dsOppNftMint,
      opponent.publicKey
    );
    await mintTo(
      provider.connection,
      payer,
      dsOppNftMint,
      dsOppNftAta,
      payer,
      1
    );

    const creatorSkrAta = getAssociatedTokenAddressSync(
      skrMint,
      creator.publicKey
    );
    const opponentSkrAta = getAssociatedTokenAddressSync(
      skrMint,
      opponent.publicKey
    );

    // Mint more SKR
    await mintTo(
      provider.connection,
      payer,
      skrMint,
      creatorSkrAta,
      payer,
      SKR_WAGER.toNumber()
    );
    await mintTo(
      provider.connection,
      payer,
      skrMint,
      opponentSkrAta,
      payer,
      SKR_WAGER.toNumber()
    );

    const [dsMatchPda] = deriveMatchPda(creator.publicKey, DOUBLE_SUBMIT_ID);
    const vaultDsNftAta = getAssociatedTokenAddressSync(
      dsNftMint,
      dsMatchPda,
      true
    );
    const vaultSkrAta = getAssociatedTokenAddressSync(
      skrMint,
      dsMatchPda,
      true
    );

    // Create match
    await program.methods
      .createMatch(DOUBLE_SUBMIT_ID, BOARD_SEED, SKR_WAGER)
      .accounts({
        creator: creator.publicKey,
        matchAccount: dsMatchPda,
        creatorNftMint: dsNftMint,
        creatorNftTokenAccount: dsNftAta,
        vaultNftTokenAccount: vaultDsNftAta,
        skrMint: skrMint,
        creatorSkrTokenAccount: creatorSkrAta,
        vaultSkrTokenAccount: vaultSkrAta,
        tokenProgram: TOKEN_PROGRAM_ID,
        associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
        systemProgram: SystemProgram.programId,
        rent: SYSVAR_RENT_PUBKEY,
      })
      .signers([creator])
      .rpc();

    // Join match
    const vaultOppNftAta = getAssociatedTokenAddressSync(
      dsOppNftMint,
      dsMatchPda,
      true
    );
    await program.methods
      .joinMatch()
      .accounts({
        opponent: opponent.publicKey,
        matchAccount: dsMatchPda,
        opponentNftMint: dsOppNftMint,
        opponentNftTokenAccount: dsOppNftAta,
        vaultOpponentNftTokenAccount: vaultOppNftAta,
        skrMint: skrMint,
        opponentSkrTokenAccount: opponentSkrAta,
        vaultSkrTokenAccount: vaultSkrAta,
        tokenProgram: TOKEN_PROGRAM_ID,
        associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
        systemProgram: SystemProgram.programId,
        rent: SYSVAR_RENT_PUBKEY,
      })
      .signers([opponent])
      .rpc();

    // Pre-create cross-NFT ATAs
    const creatorReceive = getAssociatedTokenAddressSync(
      dsOppNftMint,
      creator.publicKey
    );
    const opponentReceive = getAssociatedTokenAddressSync(
      dsNftMint,
      opponent.publicKey
    );
    await createAssociatedTokenAccount(
      provider.connection,
      payer,
      dsOppNftMint,
      creator.publicKey
    );
    await createAssociatedTokenAccount(
      provider.connection,
      payer,
      dsNftMint,
      opponent.publicKey
    );

    const submitAccounts = {
      matchAccount: dsMatchPda,
      creatorNftMint: dsNftMint,
      opponentNftMint: dsOppNftMint,
      skrMint: skrMint,
      vaultCreatorNftTokenAccount: vaultDsNftAta,
      vaultOpponentNftTokenAccount: vaultOppNftAta,
      vaultSkrTokenAccount: vaultSkrAta,
      creatorNftTokenAccount: dsNftAta,
      creatorSkrTokenAccount: creatorSkrAta,
      opponentNftTokenAccount: dsOppNftAta,
      opponentSkrTokenAccount: opponentSkrAta,
      creatorReceiveOpponentNft: creatorReceive,
      opponentReceiveCreatorNft: opponentReceive,
      tokenProgram: TOKEN_PROGRAM_ID,
      associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
      systemProgram: SystemProgram.programId,
      rent: SYSVAR_RENT_PUBKEY,
    };

    // Creator submits first score
    await program.methods
      .submitResult(50)
      .accounts({ ...submitAccounts, player: creator.publicKey })
      .signers([creator])
      .rpc();

    // Creator tries to submit again
    try {
      await program.methods
        .submitResult(60)
        .accounts({ ...submitAccounts, player: creator.publicKey })
        .signers([creator])
        .rpc();
      expect.fail("Should have thrown an error");
    } catch (err: any) {
      expect(err.toString()).to.contain("ScoreAlreadySubmitted");
    }
  });

  // =========================================================================
  // Test 8: Opponent wins scenario (opponent has higher score)
  // =========================================================================
  it("Opponent wins when they have a higher score", async () => {
    const OPP_WIN_ID = "opponent-wins-test";

    const owNftMint = await createMint(
      provider.connection,
      payer,
      payer.publicKey,
      null,
      0
    );
    const owNftAta = await createAssociatedTokenAccount(
      provider.connection,
      payer,
      owNftMint,
      creator.publicKey
    );
    await mintTo(provider.connection, payer, owNftMint, owNftAta, payer, 1);

    const owOppNftMint = await createMint(
      provider.connection,
      payer,
      payer.publicKey,
      null,
      0
    );
    const owOppNftAta = await createAssociatedTokenAccount(
      provider.connection,
      payer,
      owOppNftMint,
      opponent.publicKey
    );
    await mintTo(
      provider.connection,
      payer,
      owOppNftMint,
      owOppNftAta,
      payer,
      1
    );

    const creatorSkrAta = getAssociatedTokenAddressSync(
      skrMint,
      creator.publicKey
    );
    const opponentSkrAta = getAssociatedTokenAddressSync(
      skrMint,
      opponent.publicKey
    );
    await mintTo(
      provider.connection,
      payer,
      skrMint,
      creatorSkrAta,
      payer,
      SKR_WAGER.toNumber()
    );
    await mintTo(
      provider.connection,
      payer,
      skrMint,
      opponentSkrAta,
      payer,
      SKR_WAGER.toNumber()
    );

    const [owMatchPda] = deriveMatchPda(creator.publicKey, OPP_WIN_ID);
    const vaultOwNftAta = getAssociatedTokenAddressSync(
      owNftMint,
      owMatchPda,
      true
    );
    const vaultSkrAta = getAssociatedTokenAddressSync(
      skrMint,
      owMatchPda,
      true
    );

    // Create match
    await program.methods
      .createMatch(OPP_WIN_ID, BOARD_SEED, SKR_WAGER)
      .accounts({
        creator: creator.publicKey,
        matchAccount: owMatchPda,
        creatorNftMint: owNftMint,
        creatorNftTokenAccount: owNftAta,
        vaultNftTokenAccount: vaultOwNftAta,
        skrMint: skrMint,
        creatorSkrTokenAccount: creatorSkrAta,
        vaultSkrTokenAccount: vaultSkrAta,
        tokenProgram: TOKEN_PROGRAM_ID,
        associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
        systemProgram: SystemProgram.programId,
        rent: SYSVAR_RENT_PUBKEY,
      })
      .signers([creator])
      .rpc();

    // Join match
    const vaultOppNftAta = getAssociatedTokenAddressSync(
      owOppNftMint,
      owMatchPda,
      true
    );
    await program.methods
      .joinMatch()
      .accounts({
        opponent: opponent.publicKey,
        matchAccount: owMatchPda,
        opponentNftMint: owOppNftMint,
        opponentNftTokenAccount: owOppNftAta,
        vaultOpponentNftTokenAccount: vaultOppNftAta,
        skrMint: skrMint,
        opponentSkrTokenAccount: opponentSkrAta,
        vaultSkrTokenAccount: vaultSkrAta,
        tokenProgram: TOKEN_PROGRAM_ID,
        associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
        systemProgram: SystemProgram.programId,
        rent: SYSVAR_RENT_PUBKEY,
      })
      .signers([opponent])
      .rpc();

    // Pre-create cross-NFT ATAs
    const creatorReceive = getAssociatedTokenAddressSync(
      owOppNftMint,
      creator.publicKey
    );
    const opponentReceive = getAssociatedTokenAddressSync(
      owNftMint,
      opponent.publicKey
    );
    await createAssociatedTokenAccount(
      provider.connection,
      payer,
      owOppNftMint,
      creator.publicKey
    );
    await createAssociatedTokenAccount(
      provider.connection,
      payer,
      owNftMint,
      opponent.publicKey
    );

    const opponentSkrBefore = Number(
      (await getAccount(provider.connection, opponentSkrAta)).amount
    );

    const submitAccounts = {
      matchAccount: owMatchPda,
      creatorNftMint: owNftMint,
      opponentNftMint: owOppNftMint,
      skrMint: skrMint,
      vaultCreatorNftTokenAccount: vaultOwNftAta,
      vaultOpponentNftTokenAccount: vaultOppNftAta,
      vaultSkrTokenAccount: vaultSkrAta,
      creatorNftTokenAccount: owNftAta,
      creatorSkrTokenAccount: creatorSkrAta,
      opponentNftTokenAccount: owOppNftAta,
      opponentSkrTokenAccount: opponentSkrAta,
      creatorReceiveOpponentNft: creatorReceive,
      opponentReceiveCreatorNft: opponentReceive,
      tokenProgram: TOKEN_PROGRAM_ID,
      associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
      systemProgram: SystemProgram.programId,
      rent: SYSVAR_RENT_PUBKEY,
    };

    // Creator submits score = 30
    await program.methods
      .submitResult(30)
      .accounts({ ...submitAccounts, player: creator.publicKey })
      .signers([creator])
      .rpc();

    // Opponent submits score = 90 (higher, opponent wins)
    await program.methods
      .submitResult(90)
      .accounts({ ...submitAccounts, player: opponent.publicKey })
      .signers([opponent])
      .rpc();

    // Verify match is settled
    const matchAccount = await program.account.matchAccount.fetch(owMatchPda);
    expect(JSON.stringify(matchAccount.status)).to.equal(
      JSON.stringify({ settled: {} })
    );

    // Opponent should have both NFTs
    const opponentOwnNft = await getAccount(
      provider.connection,
      owOppNftAta
    );
    expect(Number(opponentOwnNft.amount)).to.equal(1);

    const opponentCreatorNft = await getAccount(
      provider.connection,
      opponentReceive
    );
    expect(Number(opponentCreatorNft.amount)).to.equal(1);

    // Opponent should have won 2x SKR wager
    const opponentSkrAfter = Number(
      (await getAccount(provider.connection, opponentSkrAta)).amount
    );
    expect(opponentSkrAfter).to.equal(
      opponentSkrBefore + SKR_WAGER.toNumber() * 2
    );

    // Vault should be empty
    const vaultSkrAccount = await getAccount(
      provider.connection,
      vaultSkrAta
    );
    expect(Number(vaultSkrAccount.amount)).to.equal(0);
  });
});
