/*
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

/* global getParticipantRegistry */
/*eslint-disable no-unused-vars*/
/*eslint-disable no-undef*/

'use strict';
/**
 * Process for a 
 * @param {com.relateid.simpleCopyrightNetwork.BuySong} buySong to add someone to the network
 * @return {Promise} Asset Registry Promise
 * @transaction
 */
function onBuySong(buySong) {
    console.log('### onBuySong ');
    var price = buySong.price;
    if (buySong.soldTo.balance < price ) {
        throw new Error('Buyer does not have enough money to buy the song');
    }
    var sellersPercent = buySong.songSellingAgreement.sellersPercent;
    if ( sellersPercent > 0.0 ) {
        var sellerPercent = sellersPercent / 100;
        var sellersCut = sellerPercent * price;
        buySong.songSellingAgreement.song.owner.balance = buySong.songSellingAgreement.song.owner.balance + (price - sellersCut);
        buySong.songSellingAgreement.songSeller.balance = buySong.songSellingAgreement.songSeller.balance + sellersCut;
    } else {
        buySong.song.owner.balance = buySong.song.owner.balance + price;
    }
    return getAssetRegistry('com.relateid.simpleCopyrightNetwork.LicensedSong')
        .then(function (lsr) {
            var factory = getFactory();
            var licenseSong = factory.newResource('com.relateid.simpleCopyrightNetwork', 'LicensedSong', buySong.soldTo.entityId + '-' + buySong.songSellingAgreement.songSellingAgreementId);
            licenseSong.owner = factory.newRelationship('com.relateid.simpleCopyrightNetwork', 'Entity', buySong.soldTo.entityId);
            licenseSong.songSellingAgreement = factory.newRelationship('com.relateid.simpleCopyrightNetwork', 'SongSellingAgreement', buySong.songSellingAgreement.songSellingAgreementId);
            return lsr.add(licenseSong);
        })
        .then(function() {
            return getParticipantRegistry('com.relateid.simpleCopyrightNetwork.Organization');
        })
        .then(function (or) {
            return or.update(buySong.songSellingAgreement.songSeller);
        })
        .then(function() {
            return getParticipantRegistry('com.relateid.simpleCopyrightNetwork.Person');
        })
        .then(function (pr) {
            return pr.update(buySong.songSellingAgreement.song.owner);
        })
}
