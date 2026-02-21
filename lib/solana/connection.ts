import { Connection, clusterApiUrl } from "@solana/web3.js";

const DEVNET_URL = clusterApiUrl("devnet");

export const connection = new Connection(DEVNET_URL, "confirmed");
