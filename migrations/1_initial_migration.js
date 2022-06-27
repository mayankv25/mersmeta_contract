const Migrations = artifacts.require("Migrations");
var publicChains = ['ropsten', 'rinkeby', 'kovan'];

module.exports = function (deployer, network) {
  if(publicChains.includes(network)) {
    return; 
  }
  deployer.deploy(Migrations);
};
