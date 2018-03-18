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
    
    //console.log('### sellersCut ' + sellersCut);
    console.log('### owner balance '  + buySong.songSellingAgreement.song.owner.balance);
    console.log('### seller balance '  + buySong.songSellingAgreement.songSeller.balance);

    return;

    /**
 * The transaction to buy a song.
 
transaction BuySong {
    o Double price
    --> Entity soldTo
    --> SongSellingAgreement songSellingAgreement
  }

*/

/**
 * The rights to play a song.
 


    if (!trustPerson.trustee.person.real) {
        throw new Error('Only trusted persons whom are real can register others on the network.');
    }
    if (!trustPerson.trustee.organization.trusted) {
        throw new Error('Only trusted organizations assign people to register others onto the network as real.');
    }
    return getParticipantRegistry('com.relateid.simpleCopyrightNetwork.Person')
        .then(function (personAssetRegistry) {
            var factory = getFactory();
            var person = factory.newResource('com.relateid.simpleCopyrightNetwork', 'Person', trustPerson.firstName + '-' + trustPerson.lastName);
            person.firstName = trustPerson.firstName;
            person.lastName = trustPerson.lastName;
            person.real = true;
            return personAssetRegistry.add(person);
        })
        .catch(function (error) {
            // Add optional error handling here.
        })
        */
}
