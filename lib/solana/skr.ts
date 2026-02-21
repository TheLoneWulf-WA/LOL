import { PublicKey } from "@solana/web3.js";
import { getAssociatedTokenAddress, getAccount } from "@solana/spl-token";
import { connection } from "./connection";

export const SKR_MINT = new PublicKey("SKRbvo6Gf7GondiT3BbTfuRDPqLWei4j2Qy2NPGZhW3");

/**
 * Get the SKR token balance for a wallet.
 */
export async function getSKRBalance(walletPubkey: PublicKey): Promise<number> {
  try {
    const ata = await getAssociatedTokenAddress(SKR_MINT, walletPubkey);
    const account = await getAccount(connection, ata);
    // SKR has 9 decimals
    return Number(account.amount) / 1e9;
  } catch {
    // Account doesn't exist = 0 balance
    return 0;
  }
}
