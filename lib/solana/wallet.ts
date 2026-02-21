import { Transaction, PublicKey } from "@solana/web3.js";
import { connection } from "./connection";

type PrivySolanaProvider = {
  request: (args: {
    method: string;
    params: Record<string, unknown>;
  }) => Promise<any>;
};

/**
 * Reusable helper to sign and send a transaction via Privy embedded wallet.
 * Mirrors the pattern from SolanaWalletActions.tsx.
 */
export async function sendTransaction(
  provider: PrivySolanaProvider,
  transaction: Transaction,
  feePayer: PublicKey
): Promise<string> {
  const { blockhash } = await connection.getLatestBlockhash("finalized");
  transaction.recentBlockhash = blockhash;
  transaction.feePayer = feePayer;

  const { signature } = await provider.request({
    method: "signAndSendTransaction",
    params: {
      transaction,
      connection,
    },
  });

  return signature as string;
}

/**
 * Sign a transaction without sending (for cases needing manual send).
 */
export async function signTransaction(
  provider: PrivySolanaProvider,
  transaction: Transaction,
  feePayer: PublicKey
): Promise<Transaction> {
  const { blockhash } = await connection.getLatestBlockhash("finalized");
  transaction.recentBlockhash = blockhash;
  transaction.feePayer = feePayer;

  const { signedTransaction } = await provider.request({
    method: "signTransaction",
    params: { transaction },
  });

  return signedTransaction as Transaction;
}
