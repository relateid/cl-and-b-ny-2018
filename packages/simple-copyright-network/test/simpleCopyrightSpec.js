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

    describe('#onTrustPerson', () => {

        it('should blow up because Person is not real', () => {

            let factory = businessNetworkConnection.getBusinessNetwork().getFactory();

            let unreal = factory.newResource('com.relateid.simpleCopyrightNetwork', 'Person', 'Person-1');
            unreal.firstName = 'Dan';
            unreal.lastName = 'Selman';
            unreal.real = false;


            let trusted = factory.newResource('com.relateid.simpleCopyrightNetwork', 'Organization', 'Organization-1');
            trusted.trusted = true;
            trusted.name = 'Organization One';

            let trustee = factory.newResource('com.relateid.simpleCopyrightNetwork', 'Trustee', 'Trustee-1');
            trustee.person = factory.newRelationship('com.relateid.simpleCopyrightNetwork', 'Person', 'Person-1');
            trustee.organization = factory.newRelationship('com.relateid.simpleCopyrightNetwork', 'Organization', 'Organization-1');

            // Create the transaction.
            let transaction = factory.newTransaction('com.relateid.simpleCopyrightNetwork', 'TrustPerson');
            transaction.firstName = 'New';
            transaction.lastName = 'Person';
            transaction.trustee = factory.newRelationship('com.relateid.simpleCopyrightNetwork', 'Trustee', 'Trustee-1');

            return businessNetworkConnection.getParticipantRegistry('com.relateid.simpleCopyrightNetwork.Person')
                .then((personRegistry) => {
                    return personRegistry.add(unreal);
                })
                .then(() => {
                    return businessNetworkConnection.getParticipantRegistry('com.relateid.simpleCopyrightNetwork.Organization');
                })
                .then((orgRegistry) => {
                    return orgRegistry.add(trusted);
                })
                .then(() => {
                    return businessNetworkConnection.getParticipantRegistry('com.relateid.simpleCopyrightNetwork.Trustee');
                })
                .then((trusteeRegistry) => {
                    return trusteeRegistry.add(trustee);
                })
                .then(() => {
                    return businessNetworkConnection.submitTransaction(transaction);
                })
                .then(() => {
                    throw new Error('Should have been an exception');
                })
                .catch(function (error) {
                    chai.expect(error.message).to.equal('Only trusted persons whom are real can register others on the network.');
                });
        });

        it('should blow up because Organization is not trusted', () => {

            let factory = businessNetworkConnection.getBusinessNetwork().getFactory();

            let unreal = factory.newResource('com.relateid.simpleCopyrightNetwork', 'Person', 'Person-2');
            unreal.firstName = 'Dan2';
            unreal.lastName = 'Selman2';
            unreal.real = true;


            let trusted = factory.newResource('com.relateid.simpleCopyrightNetwork', 'Organization', 'Organization-2');
            trusted.trusted = false;
            trusted.name = 'Organization Two';

            let trustee = factory.newResource('com.relateid.simpleCopyrightNetwork', 'Trustee', 'Trustee-2');
            trustee.person = factory.newRelationship('com.relateid.simpleCopyrightNetwork', 'Person', 'Person-2');
            trustee.organization = factory.newRelationship('com.relateid.simpleCopyrightNetwork', 'Organization', 'Organization-2');

            // Create the transaction.
            let transaction = factory.newTransaction('com.relateid.simpleCopyrightNetwork', 'TrustPerson');
            transaction.firstName = 'New';
            transaction.lastName = 'Person';
            transaction.trustee = factory.newRelationship('com.relateid.simpleCopyrightNetwork', 'Trustee', 'Trustee-2');

            return businessNetworkConnection.getParticipantRegistry('com.relateid.simpleCopyrightNetwork.Person')
                .then((personRegistry) => {
                    return personRegistry.add(unreal);
                })
                .then(() => {
                    return businessNetworkConnection.getParticipantRegistry('com.relateid.simpleCopyrightNetwork.Organization');
                })
                .then((orgRegistry) => {
                    return orgRegistry.add(trusted);
                })
                .then(() => {
                    return businessNetworkConnection.getParticipantRegistry('com.relateid.simpleCopyrightNetwork.Trustee');
                })
                .then((trusteeRegistry) => {
                    return trusteeRegistry.add(trustee);
                })
                .then(() => {
                    return businessNetworkConnection.submitTransaction(transaction);
                })
                .then(() => {
                    throw new Error('Should have been an exception');
                })
                .catch(function (error) {
                    chai.expect(error.message).to.equal('Only trusted organizations assign people to register others onto the network as real.');
                });
        });

        it('should successfully add the person', () => {

            let factory = businessNetworkConnection.getBusinessNetwork().getFactory();

            let unreal = factory.newResource('com.relateid.simpleCopyrightNetwork', 'Person', 'Person-3');
            unreal.firstName = 'Dan3';
            unreal.lastName = 'Selman3';
            unreal.real = true;


            let trusted = factory.newResource('com.relateid.simpleCopyrightNetwork', 'Organization', 'Organization-3');
            trusted.trusted = true;
            trusted.name = 'Organization Three';

            let trustee = factory.newResource('com.relateid.simpleCopyrightNetwork', 'Trustee', 'Trustee-3');
            trustee.person = factory.newRelationship('com.relateid.simpleCopyrightNetwork', 'Person', 'Person-3');
            trustee.organization = factory.newRelationship('com.relateid.simpleCopyrightNetwork', 'Organization', 'Organization-3');

            // Create the transaction.
            let transaction = factory.newTransaction('com.relateid.simpleCopyrightNetwork', 'TrustPerson');
            transaction.firstName = 'New';
            transaction.lastName = 'Person';
            transaction.trustee = factory.newRelationship('com.relateid.simpleCopyrightNetwork', 'Trustee', 'Trustee-3');

            return businessNetworkConnection.getParticipantRegistry('com.relateid.simpleCopyrightNetwork.Person')
                .then((personRegistry) => {
                    return personRegistry.add(unreal);
                })
                .then(() => {
                    return businessNetworkConnection.getParticipantRegistry('com.relateid.simpleCopyrightNetwork.Organization');
                })
                .then((orgRegistry) => {
                    return orgRegistry.add(trusted);
                })
                .then(() => {
                    return businessNetworkConnection.getParticipantRegistry('com.relateid.simpleCopyrightNetwork.Trustee');
                })
                .then((trusteeRegistry) => {
                    return trusteeRegistry.add(trustee);
                })
                .then(() => {
                    return businessNetworkConnection.submitTransaction(transaction);
                })
                .then(() => {
                    return businessNetworkConnection.getParticipantRegistry('com.relateid.simpleCopyrightNetwork.Person');
                })
                .then(function (personRegistry) {
                    return personRegistry.exists('New-Person');
                })
                .then(function (exists) {
                    console.log('Person Exists: ', exists);
                    chai.expect(exists).to.be.true;
                })
                .catch(function (error) {
                    throw new Error('Should not have an exception');
                });
        });
    });
});
