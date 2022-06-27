const { deployProxy } = require("@openzeppelin/truffle-upgrades");

const VerumWorld = artifacts.require("VerumWorld");
const NAME = process.env.NAME;
const SYMBOL = process.env.SYMBOL;

module.exports = async function (deployer) {
  const instance = await deployProxy(
    VerumWorld,
    [NAME, SYMBOL],
    {
      deployer,
    }
  );
};