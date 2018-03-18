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

'use strict';

const AdminConnection = require('composer-admin').AdminConnection;
const BusinessNetworkConnection = require('composer-client').BusinessNetworkConnection;
const BusinessNetworkDefinition = require('composer-common').BusinessNetworkDefinition;
const IdCard = require('composer-common').IdCard;
const MemoryCardStore = require('composer-common').MemoryCardStore;
const path = require('path');

const chai = require('chai');

describe('SimpleCopyright', () => {
    // In-memory card store for testing so cards are not persisted to the file system
    const cardStore = new MemoryCardStore();
    let adminConnection;
    let businessNetworkConnection;

    before(() => {
        // Embedded connection used for local testing
        const connectionProfile = {
            name: 'embedded',
            type: 'embedded'
        };
        // Embedded connection does not need real credentials
        const credentials = {
            certificate: 'FAKE CERTIFICATE',
            privateKey: 'FAKE PRIVATE KEY'
        };

        // PeerAdmin identity used with the admin connection to deploy business networks
        const deployerMetadata = {
            version: 1,
            userName: 'PeerAdmin',
            roles: [ 'PeerAdmin', 'ChannelAdmin' ]
        };
        const deployerCard = new IdCard(deployerMetadata, connectionProfile);
        deployerCard.setCredentials(credentials);

        const deployerCardName = 'PeerAdmin';
        adminConnection = new AdminConnection({ cardStore: cardStore });

        return adminConnection.importCard(deployerCardName, deployerCard).then(() => {
            return adminConnection.connect(deployerCardName);
        });
    });

    beforeEach(() => {
        businessNetworkConnection = new BusinessNetworkConnection({ cardStore: cardStore });

        const adminUserName = 'admin';
        let adminCardName;
        let businessNetworkDefinition;

        return BusinessNetworkDefinition.fromDirectory(path.resolve(__dirname, '..')).then(definition => {
            businessNetworkDefinition = definition;
            // Install the Composer runtime for the new business network
            return adminConnection.install(businessNetworkDefinition.getName());
        }).then(() => {
            // Start the business network and configure an network admin identity
            const startOptions = {
                networkAdmins: [
                    {
                        userName: adminUserName,
                        enrollmentSecret: 'adminpw'
                    }
                ]
            };
            return adminConnection.start(businessNetworkDefinition, startOptions);
        }).then(adminCards => {
            // Import the network admin identity for us to use
            adminCardName = `${adminUserName}@${businessNetworkDefinition.getName()}`;
            return adminConnection.importCard(adminCardName, adminCards.get(adminUserName));
        }).then(() => {
            // Connect to the business network using the network admin identity
            return businessNetworkConnection.connect(adminCardName);
        });
    });

    describe('#onBuySongn', () => {

        it('should blow up because the buyer does not have the funds', () => {

            let factory = businessNetworkConnection.getBusinessNetwork().getFactory();

            let emmanuel = factory.newResource('com.relateid.simpleCopyrightNetwork', 'Person', 'Emmanuel-Smith');
            emmanuel.firstName = 'Emmanuel';
            emmanuel.lastName = 'Smith';
            emmanuel.real = true;

            let buyer = factory.newResource('com.relateid.simpleCopyrightNetwork', 'Person', 'Song-Buyer');
            buyer.firstName = 'Song';
            buyer.lastName = 'Buyer';
            buyer.balance = 9.0;
            buyer.real = true;

            let peaceTones = factory.newResource('com.relateid.simpleCopyrightNetwork', 'Organization', 'PeaceTones');
            peaceTones.trusted = true;
            peaceTones.name = 'PeaceTones';

            let song = factory.newResource('com.relateid.simpleCopyrightNetwork', 'Song', 'Emmanuels-Song');
            song.copyrighted = true;
            song.name = 'Song One';
            song.hash = 'hash';
            song.owner = factory.newRelationship('com.relateid.simpleCopyrightNetwork', 'Person', 'Emmanuel-Smith');

            let license = factory.newResource('com.relateid.simpleCopyrightNetwork', 'License', 'Commercial-License');
            license.licenseType = 'COMMERCIAL_USE';


            let agreement = factory.newResource('com.relateid.simpleCopyrightNetwork', 'SongSellingAgreement', 'SongSellingAgreement-1');
            agreement.sellersPercent = 10.0;
            agreement.songSeller = factory.newRelationship('com.relateid.simpleCopyrightNetwork', 'Organization', 'PeaceTones');
            agreement.song = factory.newRelationship('com.relateid.simpleCopyrightNetwork', 'Song', 'Emmanuels-Song');
            agreement.license = factory.newRelationship('com.relateid.simpleCopyrightNetwork', 'License', 'Commercial-License');

            return businessNetworkConnection.getParticipantRegistry('com.relateid.simpleCopyrightNetwork.Person')
                .then((personRegistry) => {
                    return personRegistry.addAll([emmanuel, buyer]);
                })
                .then(() => {
                    return businessNetworkConnection.getParticipantRegistry('com.relateid.simpleCopyrightNetwork.Organization');
                })
                .then((orgRegistry) => {
                    return orgRegistry.add(peaceTones);
                })
                .then(() => {
                    return businessNetworkConnection.getAssetRegistry('com.relateid.simpleCopyrightNetwork.Song');
                })
                .then((songRegistry) => {
                    return songRegistry.add(song);
                })
                .then(() => {
                    return businessNetworkConnection.getAssetRegistry('com.relateid.simpleCopyrightNetwork.License');
                })
                .then((licenseRegistry) => {
                    return licenseRegistry.add(license);
                }).then(() => {
                    return businessNetworkConnection.getAssetRegistry('com.relateid.simpleCopyrightNetwork.SongSellingAgreement');
                })
                .then((songSellingAgreementRegistry) => {
                    return songSellingAgreementRegistry.add(agreement);
                })
                .then(() => {
                    let buySong = factory.newTransaction('com.relateid.simpleCopyrightNetwork', 'BuySong');
                    buySong.price = 10.0;
                    buySong.soldTo = factory.newRelationship('com.relateid.simpleCopyrightNetwork', 'Person', 'Song-Buyer');
                    buySong.songSellingAgreement = factory.newRelationship('com.relateid.simpleCopyrightNetwork', 'SongSellingAgreement', 'SongSellingAgreement-1');
                    return businessNetworkConnection.submitTransaction(buySong);
                })
                .then(() => {
                    throw new Error('Should have been an exception');
                })
                .catch(function (error) {
                    chai.expect(error.message).to.equal('Buyer does not have enough money to buy the song');
                });
        });
    });
});
