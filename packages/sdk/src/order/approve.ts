import type { Address, Asset } from "@rarible/ethereum-api-client"
import type { Ethereum, EthereumTransaction } from "@rarible/ethereum-provider"
import type { Maybe } from "@rarible/types/build/maybe"
import type { TransferProxies } from "../config/type"
import type { SendFunction } from "../common/send-transaction"
import { approveErc20 } from "./approve-erc20"
import { approveErc721 } from "./approve-erc721"
import { approveErc1155 } from "./approve-erc1155"
import { approveCryptoPunk } from "./approve-crypto-punk"

export type ApproveFunction =
	(owner: Address, asset: Asset, infinite: undefined | boolean) => Promise<EthereumTransaction | undefined>

export async function approve(
	ethereum: Maybe<Ethereum>,
	send: SendFunction,
	config: { nft:Address, erc1155Lazy: Address},
	owner: Address,
	asset: Asset,
	infinite: undefined | boolean = true
): Promise<EthereumTransaction | undefined> {
	switch (asset.assetType.assetClass) {
		case "ERC1155": {
			const contract = asset.assetType.contract
			const operator = config.nft
			return approveErc1155(ethereum, send, contract, owner, operator)
		}
		case "ERC1155_LAZY": {
			const contract = asset.assetType.contract
			const operator = config.erc1155Lazy
			return approveErc1155(ethereum, send, contract, owner, operator)
		}
		default: return undefined
	}
}
