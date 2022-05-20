import type { Ethereum, EthereumTransaction } from "@rarible/ethereum-provider"
import { toAddress } from "@rarible/types"
import { Action } from "@rarible/action"
import type { Address, AssetType } from "@rarible/ethereum-api-client"
import type { Maybe } from "@rarible/types/build/maybe"
import type {
	SimpleCryptoPunkOrder,
	SimpleLegacyOrder,
	SimpleOpenSeaV1Order,
	SimpleOrder,
	SimpleRaribleV2Order,
} from "../types"
import type { SendFunction } from "../../common/send-transaction"
import type { EthereumConfig } from "../../config/type"
import type { RaribleEthereumApis } from "../../common/apis"
import type { CheckAssetTypeFunction } from "../check-asset-type"
import { checkAssetType } from "../check-asset-type"
import { checkLazyAssetType } from "../check-lazy-asset-type"
import { checkChainId } from "../check-chain-id"
import type { IRaribleEthereumSdkConfig } from "../../types"
import type {
	CryptoPunksOrderFillRequest,
	FillOrderAction,
	FillOrderRequest,
	FillOrderStageId,
	GetOrderBuyTxRequest,
	LegacyOrderFillRequest,
	OpenSeaV1OrderFillRequest,
	OrderFillSendData,
	OrderFillTransactionData,
	RaribleV2OrderFillRequest,
	TransactionData,
} from "./types"
import { RaribleV1OrderHandler } from "./rarible-v1"
import { RaribleV2OrderHandler } from "./rarible-v2"
import { OpenSeaOrderHandler } from "./open-sea"
import { CryptoPunksOrderHandler } from "./crypto-punks"
import {FEE_CONFIG_URL} from "../../config/common";

export class OrderFiller {
	v2Handler: RaribleV2OrderHandler
	constructor(
		private readonly ethereum: Maybe<Ethereum>,
		private readonly send: SendFunction,
		private readonly config: { chainId: number, exchange:{v2:Address}, transferProxies:{nft:Address, erc1155Lazy: Address} },
		private readonly getBaseOrderFee: (type: SimpleOrder["type"]) => Promise<number>,
		private readonly sdkConfig?: IRaribleEthereumSdkConfig
	) {
		this.getBaseOrderFillFee = this.getBaseOrderFillFee.bind(this)
		this.getTransactionData = this.getTransactionData.bind(this)
		this.getBuyTx = this.getBuyTx.bind(this)
		this.v2Handler = new RaribleV2OrderHandler(ethereum, send, config, getBaseOrderFee)

	}

	private getFillAction<Request extends FillOrderRequest>(): Action<FillOrderStageId, Request, EthereumTransaction> {
		return Action
			.create({
				id: "approve" as const,
				run: async (request: Request) => {
					if (!this.ethereum) {
						throw new Error("Wallet undefined")
					}
					const from = toAddress(await this.ethereum.getFrom())
					const inverted = await this.invertOrder(request, from)
					await this.approveOrder(inverted, Boolean(request.infinite))
					return { request, inverted }
				},
			})
			.thenStep({
				id: "send-tx" as const,
				run: async ({ inverted, request }: { inverted: SimpleOrder, request: Request }) => {
					return this.sendTransaction(request, inverted)
				},
			})
			.before(async (input: Request) => {
				await checkChainId(this.ethereum, this.config)
				console.debug('checkChainId', input)
				return input
			})
	}

	/**
	 * @deprecated Use {@link buy} or {@link acceptBid} instead
	 */
	fill: FillOrderAction = this.getFillAction()

	/**
	 * Buy order
	 */
	buy: FillOrderAction = this.getFillAction()

	/**
	 * Accept bid order
	 */
	acceptBid: FillOrderAction = this.getFillAction()

	async getBuyTx({request, from}: GetOrderBuyTxRequest): Promise<TransactionData> {
		const inverted = await this.invertOrder(request, from)
		const {functionCall, options} = await this.getTransactionRequestData(request, inverted)
		const callInfo = await functionCall.getCallInfo()
		const value = options.value?.toString() || "0"
		return {
			from,
			value,
			data: functionCall.data,
			to: callInfo.contract,
		}
	}

	private async invertOrder(request: FillOrderRequest, from: Address) {
		switch (request.order.type) {
			case "RARIBLE_V2":
				return this.v2Handler.invert(<RaribleV2OrderFillRequest>request, from)
			default:
				throw new Error(`Unsupported order: ${JSON.stringify(request)}`)
		}
	}

	private async approveOrder(inverted: SimpleOrder, isInfinite: boolean) {
		switch (inverted.type) {
			case "RARIBLE_V2":
				return this.v2Handler.approve(inverted, isInfinite)
			default:
				throw new Error(`Unsupported order: ${JSON.stringify(inverted)}`)
		}
	}

	private async sendTransaction(request: FillOrderRequest, inverted: SimpleOrder) {
		switch (inverted.type) {
			case "RARIBLE_V2":
				return this.v2Handler.sendTransaction(<SimpleRaribleV2Order>request.order, inverted)
			default:
				throw new Error(`Unsupported order: ${JSON.stringify(inverted)}`)
		}
	}

	private async getTransactionRequestData(
		request: FillOrderRequest, inverted: SimpleOrder
	): Promise<OrderFillSendData> {
		switch (request.order.type) {
			case "RARIBLE_V2":
				return this.v2Handler.getTransactionData(
          <SimpleRaribleV2Order>request.order,
          <SimpleRaribleV2Order>inverted,
				)
			default:
				throw new Error(`Unsupported request: ${JSON.stringify(request)}`)
		}
	}

	async getTransactionData(
		request: FillOrderRequest
	): Promise<OrderFillTransactionData> {
		if (!this.ethereum) {
			throw new Error("Wallet undefined")
		}
		await checkChainId(this.ethereum, this.config)
		const from = toAddress(await this.ethereum.getFrom())
		const inverted = await this.invertOrder(request, from)
		const {functionCall, options} = await this.getTransactionRequestData(request, inverted)

		return {
			data: functionCall.data,
			options,
		}
	}

	async getOrderFee(order: SimpleOrder): Promise<number> {
		switch (order.type) {
			case "RARIBLE_V2":
				return this.v2Handler.getOrderFee(order)
			default:
				throw new Error(`Unsupported order: ${JSON.stringify(order)}`)
		}
	}

	async getBaseOrderFillFee(order: SimpleOrder): Promise<number> {
		switch (order.type) {
			case "RARIBLE_V2":
				return this.v2Handler.getBaseOrderFee()
			default:
				throw new Error(`Unsupported order: ${JSON.stringify(order)}`)
		}
	}
}
