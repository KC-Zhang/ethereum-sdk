import {
    Binary,
    EIP712Domain, LazyErc1155, Part,
} from "@rarible/protocol-api-client"
import Web3 from "web3"
import {Address, BigNumber, toBinary} from "@rarible/types"
import {signTypedData} from "../common/sign-typed-data";
import {EIP721_DOMAIN_NFT_TEMPLATE, EIP721_NFT_TYPE, EIP721_NFT_TYPES} from "./eip712";
import { LazyErc721 } from "@rarible/protocol-api-client/build/models/LazyNft"

export type SimpleLazyNft<K extends keyof any> = Omit<LazyErc721, K> | Omit<LazyErc1155, K>

export async function signNft(
    web3: Web3,
    chainId: number,
    nft: SimpleLazyNft<"signatures">,
): Promise<Binary> {
    switch (nft['@type']) {
        case "ERC721": {
            const domain = createEIP712NftDomain(chainId, nft.contract)

            const data = {
                types: EIP721_NFT_TYPES,
                domain,
                primaryType: EIP721_NFT_TYPE,
                message: {...nft, tokenURI: nft.uri}
            }
            return signTypedData(web3, nft.creators[0].account, data)
        }
        case "ERC1155"://TODO impl
            return Promise.resolve(toBinary(''))
    }
}


function createEIP712NftDomain(chainId: number, verifyingContract: Address): EIP712Domain {
    return {
        ...EIP721_DOMAIN_NFT_TEMPLATE,
        chainId,
        verifyingContract: verifyingContract,
    }
}


