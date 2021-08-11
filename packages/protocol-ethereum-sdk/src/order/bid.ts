import { UpsertOrderFunction } from "./upsert-order"
import {
	Address,
	NftItemControllerApi,
	OrderForm,
	Part,
	EthAssetType,
	Erc20AssetType
} from "@rarible/protocol-api-client"
import { randomWord, toBigNumber } from "@rarible/types"
import { toBn } from "../common/to-bn"
import BN from "bignumber.js"
import {AssetTypeRequest, AssetTypeResponse} from "./check-asset-type";

export type BidRequest = {
	maker: Address
	makeAssetType: EthAssetType | Erc20AssetType,
	amount: number
	takeAssetType: AssetTypeRequest,
	price: BN.Value
	payouts: Array<Part>
	originFees: Array<Part>
}

export async function bid(
	api: NftItemControllerApi,
	upsertOrder: UpsertOrderFunction,
	checkAssetType: (asset: AssetTypeRequest) => Promise<AssetTypeResponse>,
	request: BidRequest,
) {
	const order: OrderForm = {
		maker: request.maker,
		make: {
			assetType: request.makeAssetType,
			value: toBigNumber(toBn(request.price).multipliedBy(request.amount).toString()),
		},
		take: {
			assetType: await checkAssetType(request.takeAssetType),
			value: toBigNumber(`${request.amount}`)
		},
		type: "RARIBLE_V2",
		data: {
			dataType: "RARIBLE_V2_DATA_V1",
			payouts: request.payouts,
			originFees: request.originFees
		},
		salt: toBigNumber(toBn(randomWord(), 16).toString(10))
	}
	return upsertOrder(order, false)
}