import type { Maybe } from "@rarible/types/build/maybe"
import type { Ethereum } from "@rarible/ethereum-provider"
import type { EthereumConfig } from "../config/type"
import { getRequiredWallet } from "../common/get-required-wallet"

/**
 * Check the wallet chainId is the same as in the config
 * @param ethereum Wallet
 * @param config EthereumConfig
 */
export async function checkChainId(ethereum: Maybe<Ethereum>, config: { chainId: number }): Promise<boolean> {
	const networkId = await getRequiredWallet(ethereum).getChainId()
	if (config.chainId !== networkId) {
		throw new Error(`Config chainId=${config.chainId}, but wallet chainId=${networkId}`)
	}
	return true
}
