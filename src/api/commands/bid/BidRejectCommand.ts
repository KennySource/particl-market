import * as _ from 'lodash';
import { inject, named } from 'inversify';
import { validate, request } from '../../../core/api/Validate';
import { Logger as LoggerType } from '../../../core/Logger';
import { Types, Core, Targets } from '../../../constants';
import * as resources from 'resources';

import { RpcRequest } from '../../requests/RpcRequest';
import { RpcCommandInterface } from '../RpcCommandInterface';
import { ListingItemService } from '../../services/ListingItemService';
import { MessageException } from '../../exceptions/MessageException';
import { Commands} from '../CommandEnumType';
import { BaseCommand } from '../BaseCommand';
import { BidActionService } from '../../services/BidActionService';
import { SmsgSendResponse } from '../../responses/SmsgSendResponse';

export class BidRejectCommand extends BaseCommand implements RpcCommandInterface<SmsgSendResponse> {

    public log: LoggerType;

    constructor(
        @inject(Types.Core) @named(Core.Logger) public Logger: typeof LoggerType,
        @inject(Types.Service) @named(Targets.Service.ListingItemService) private listingItemService: ListingItemService,
        @inject(Types.Service) @named(Targets.Service.BidActionService) private bidActionService: BidActionService
    ) {
        super(Commands.BID_REJECT);
        this.log = new Logger(__filename);
    }

    /**
     * data.params[]:
     * [0]: item, string
     *
     * @param data
     * @returns {Promise<Bookshelf<Bid>}
     */
    @validate()
    public async execute( @request(RpcRequest) data: RpcRequest): Promise<SmsgSendResponse> {
        const itemHash = data.params[0];
        const bidId = data.params[1];

        // find listingItem by hash
        const listingItemModel = await this.listingItemService.findOneByHash(itemHash);
        const listingItem = listingItemModel.toJSON();

        // make sure we have a ListingItemTemplate, so we know it's our item
        if (_.isEmpty(listingItem.ListingItemTemplate)) {
            throw new MessageException('Not your item.');
        }

        // find the bid
        const bids: resources.Bid[] = listingItem.Bids;
        const bidToAccept = _.find(bids, (bid) => {
            return bid.id === bidId;
        });

        if (!bidToAccept) {
            throw new MessageException('Bid not found.');
        }

        return this.bidActionService.reject(listingItem, bidToAccept);
    }

    public usage(): string {
        return this.getName() + ' <itemhash> ';
    }

    public help(): string {
        return this.usage() + ' -  ' + this.description() + '\n'
        + '    <itemhash>               - String - The hash if the item whose bid we want to reject. ';
    }

    public description(): string {
        return 'Reject bid.';
    }

    public example(): string {
        return 'bid ' + this.getName() + ' b90cee25-036b-4dca-8b17-0187ff325dbb ';
    }
}
