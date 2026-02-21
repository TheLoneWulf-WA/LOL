import Constants from "expo-constants";
import { NFTAsset } from "@/stores/walletStore";

const HELIUS_API_KEY = Constants.expoConfig?.extra?.heliusApiKey ?? "";
const HELIUS_RPC_URL = `https://devnet.helius-rpc.com/?api-key=${HELIUS_API_KEY}`;

interface HeliusAsset {
  id: string;
  content: {
    metadata: { name: string };
    links?: { image?: string };
    files?: { uri?: string }[];
  };
  grouping?: { group_key: string; group_value: string }[];
}

/**
 * Fetch all NFTs owned by a wallet using the Helius DAS API.
 */
export async function fetchNFTs(ownerAddress: string): Promise<NFTAsset[]> {
  const response = await fetch(HELIUS_RPC_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      jsonrpc: "2.0",
      id: "lol-nfts",
      method: "getAssetsByOwner",
      params: {
        ownerAddress,
        page: 1,
        limit: 100,
        displayOptions: { showFungible: false },
      },
    }),
  });

  const json = await response.json();
  const items: HeliusAsset[] = json.result?.items ?? [];

  return items.map((item) => ({
    id: item.id,
    mint: item.id,
    name: item.content.metadata.name ?? "Unknown NFT",
    image: item.content.links?.image ?? item.content.files?.[0]?.uri ?? "",
    collection: item.grouping?.find((g) => g.group_key === "collection")?.group_value,
  }));
}
