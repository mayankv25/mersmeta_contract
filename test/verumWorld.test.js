const {
  BN, // Big Number support
  constants, // Common constants, like the zero address and largest integers
  expectEvent, // Assertions for emitted events
  expectRevert, // Assertions for transactions that should fail
  time,
} = require("@openzeppelin/test-helpers");
const { deployProxy, upgradeProxy } = require("@openzeppelin/truffle-upgrades");
const { fromWei, toWei } = require("web3-utils");

const { MerkleTree } = require("merkletreejs");
const keccak256 = require("keccak256");

const VerumWorld = artifacts.require("VerumWorld");
const MustafaCeceli = artifacts.require("MustafaCeceli");

contract("VerumWorld", async (accounts) => {
  const EventNames = {
    BaseURIUpdated: "BaseURIUpdated",
    NewNFTCreated: "NewNFTCreated",
    NewAvatarCreated: "NewAvatarCreated",
    NewBatchCreated: "NewBatchCreated",
    Transfer: "Transfer",
    ApprovalForAll: "ApprovalForAll",
  };

  const [owner, user, artist, steve, george, nonWhiteListUser] =
    accounts;

  let whitelistAddress = [owner, user, artist, steve, george];

  const leafNodes = whitelistAddress.map((addr) => keccak256(addr));
  const merkleTree = new MerkleTree(leafNodes, keccak256, { sortPair: true });
  const merkleHashArtist = merkleTree.getHexProof(keccak256(whitelistAddress[2]));
  const name = "VerumWorld";
  const symbol = "VWC";
  const baseURI1 =
    "https://ipfs.io/ipfs/QmT5LTjW2oenEF3tSDQreSGtMfwxTw6SQbf3tSER1BLx2Z/";
  const baseURI2 =
    "https://ipfs.io/ipfs/QmWzd6AsrxEoRNnMTVAomZCExH8JLz2GQNsNgQc4kKZ1Fu/";
  const constantTokenID = 0;
  const burnTokenId = 0;
  const unpause = true;
  const pause = false;
  const incorrectCollectionId = "abcds"
  const mintPrice = toWei("0.1", "ether");
  const _collectionID = "abc";
  const nullBytes = "0x";
  let VerumWorldInstance = null;
  let mustafaCeceliInstance = null;
  let total = 0;
  let index = 0;
  let batch = 0;
  let avatartotal = 0;
  let steveSupplyCount = 0;
  let correctAirdropedTokenId = 1;
  let incorrectAirdropedTokenId = 3;

  async function initContract() {
    VerumWorldInstance = await deployProxy(VerumWorld, [
      name,
      symbol
    ]);
    mustafaCeceliInstance = await deployProxy(MustafaCeceli, [
      name,
      symbol,
      VerumWorldInstance.address,
      mintPrice,
    ]);
  }

  before("Deploy new Utility Token Contract", async () => {
    await initContract();
  });

  beforeEach("Deploy new Utility Token Contract", async () => {
    await new Promise(resolve => setTimeout(resolve, 100));
  });

  describe("Initial State", () => {
    describe("when the utility contract is instantiated", function () {
      it("has a name", async function () {
        expect(await VerumWorldInstance.name()).to.equal(name);
      });

      it("has a symbol", async function () {
        expect(await VerumWorldInstance.symbol()).to.equal(symbol);
      });

      it("has zero initial supply", async function () {
        expect(
          (await VerumWorldInstance.totalSupply(constantTokenID)).toNumber()
        ).to.equal(total);
        for (const acc of accounts) {
          expect(
            (await VerumWorldInstance.balanceOf(acc, constantTokenID)).toNumber()
          ).to.equal(0);
        }
      });

      it("should create a new utility contract address", async () => {
        expect(VerumWorldInstance.address);
      });

      it("should check the owner address", async () => {
        expect(await VerumWorldInstance.owner()).to.equal(owner);
      });

      it("should not mint token when batch is not active", async () => {
        await expectRevert(
          VerumWorldInstance.mint(_collectionID, merkleHashArtist, {
            from: artist,
            value: mintPrice,
          }),
          "VerumWorld: Currently no batch is active"
        );
        expect((await VerumWorldInstance.totalSupply(constantTokenID)).toNumber()).to.equal(
          total
        );
        
      });
    });
  });

  describe("addNewArtistCollection", () => {
    describe("when owner tries to add new artist", function () {
      it("should add new artist", async () => {
        await VerumWorldInstance.addNewArtistCollection(artist, mustafaCeceliInstance.address, _collectionID, baseURI1, {
          from: owner,
        });
        const newArtistReceipt = await VerumWorldInstance.artistCollections(
          _collectionID
        );
        expect(newArtistReceipt.collectionID).to.equal(_collectionID);
        expect(
          (await VerumWorldInstance.totalSupply(constantTokenID)).toNumber()
        ).to.equal(total);
      });

      it("should not add new artist with same _collectionID", async () => {
        await expectRevert(
          VerumWorldInstance.addNewArtistCollection(artist, mustafaCeceliInstance.address, _collectionID, baseURI1, {
            from: owner,
          }),
          "Collection id already exists"
        );
        expect(
          (await VerumWorldInstance.totalSupply(constantTokenID)).toNumber()
        ).to.equal(total);
      });
    });

    describe("when other user tries to add new artist", function () {
      it("should not add new artist", async () => {
        await expectRevert(
          VerumWorldInstance.addNewArtistCollection(artist, mustafaCeceliInstance.address, _collectionID, baseURI1, {
            from: george,
          }),
          "Ownable: caller is not the owner"
        );
        expect(
          (await VerumWorldInstance.totalSupply(constantTokenID)).toNumber()
        ).to.equal(total);
      });
    });
  });

  describe("createBatchForArtistCollection", () => {
    let startTime = Math.floor(new Date() / 1000);
    let endTime = Math.floor(new Date() / 1000) + 1000;
    let merkleHash = merkleTree.getHexRoot();

    describe("when artist tries to add a new batch", function () {
      it("should not add a new batch for zero mint price", async () => {
        let wrongMintPrice = 0;
        await expectRevert(
          VerumWorldInstance.createBatchForArtistCollection(
            _collectionID,
            startTime,
            endTime,
            wrongMintPrice,
            merkleHash,
            { from: artist }
          ),
          "New Batch mint price should be greater than zero"
        );
        expect((await VerumWorldInstance.totalSupply(constantTokenID)).toNumber()).to.equal(
          total
        );
      });

      it("should not add a new batch for end time less than start time", async () => {
        let wrongEndTime = endTime - 10000;
        await expectRevert(
          VerumWorldInstance.createBatchForArtistCollection(
            _collectionID,
            startTime,
            wrongEndTime,
            mintPrice,
            merkleHash,
            { from: artist }
          ),
          "VerumWorld: Batch start time should be less than end time"
        );
        expect((await VerumWorldInstance.totalSupply(constantTokenID)).toNumber()).to.equal(
          total
        );
      });

      it("should not add a new batch for less than current time", async () => {
        let wrongEndTime = startTime + 1;
        await expectRevert(
          VerumWorldInstance.createBatchForArtistCollection(
            _collectionID,
            startTime,
            wrongEndTime,
            mintPrice,
            merkleHash,
            { from: artist }
          ),
          "VerumWorld: New Batch end time should be greater than current time"
        );
        expect((await VerumWorldInstance.totalSupply(constantTokenID)).toNumber()).to.equal(
          total
        );
      });

      it("should add a new batch", async () => {
        const addBatchReceipt =
          await VerumWorldInstance.createBatchForArtistCollection(
            _collectionID,
            startTime,
            endTime,
            mintPrice,
            merkleHash,
            { from: artist }
          );
        await expectEvent(addBatchReceipt, EventNames.NewBatchCreated, {
          batchIndex: _collectionID,
        });
        batch += 1;
        expect((await VerumWorldInstance.totalSupply(constantTokenID)).toNumber()).to.equal(
          total
        );
      });
    });

    describe("when other user tries to add a new batch", function () {
      it("should not add a new batch", async () => {
        await expectRevert(
          VerumWorldInstance.createBatchForArtistCollection(
            _collectionID,
            startTime,
            endTime,
            mintPrice,
            merkleHash,
            { from: george }
          ),
          "VerumWorld: Caller is not the artist"
        );
        expect((await VerumWorldInstance.totalSupply(constantTokenID)).toNumber()).to.equal(
          total
        );
      });
    });
  });

  describe("updateBatchMintPriceForArtistCollection", () => {
    describe("when owner tries to update mint price of a batch", function () {
      let wrongMintPrice = 0;
      it("should not update mint price of a batch", async () => {
        await expectRevert(
          VerumWorldInstance.updateBatchMintPriceForArtistCollection(_collectionID, wrongMintPrice, { from: george }),
          "VerumWorld: Caller is not the artist"
        );
        expect((await VerumWorldInstance.totalSupply(constantTokenID)).toNumber()).to.equal(
          total
        );
      });

      it("should update mint price of a batch", async () => {
        const updateBatchReceipt = await VerumWorldInstance.updateBatchMintPriceForArtistCollection(
          _collectionID,
          mintPrice,
          { from: artist }
        );
        expect((await VerumWorldInstance.totalSupply(constantTokenID)).toNumber()).to.equal(
          total
        );
      });
    });

    describe("when other user tries to update batch mint price", function () {
      it("should not update batch mint price", async () => {
        await expectRevert(
          VerumWorldInstance.updateBatchMintPriceForArtistCollection(_collectionID, mintPrice, { from: george }),
          "VerumWorld: Caller is not the artist"
        );
        expect((await VerumWorldInstance.totalSupply(constantTokenID)).toNumber()).to.equal(
          total
        );
      });
    });
  });

  describe("updateBatchEndTimeForArtistCollection", () => {
    let startTime = Math.floor(new Date() / 1000);
    let endTime = Math.floor(new Date() / 1000) + 27;

    describe("when owner tries to update a batch end time", function () {
      it("should not update the batch for end time less than start time", async () => {
        let wrongEndTime = endTime - 10000;
        await expectRevert(
          VerumWorldInstance.updateBatchEndTimeForArtistCollection(_collectionID, wrongEndTime, { from: artist }),
          "VerumWorld: Batch start time should be less than end time"
        );
        expect((await VerumWorldInstance.totalSupply(constantTokenID)).toNumber()).to.equal(
          total
        );
      });

      it("should not update the batch for less than current time", async () => {
        let wrongEndTime = startTime + 1;
        await expectRevert(
          VerumWorldInstance.updateBatchEndTimeForArtistCollection(_collectionID, wrongEndTime, { from: artist }),
          "VerumWorld: Batch end time should be greater than current time"
        );
        expect((await VerumWorldInstance.totalSupply(constantTokenID)).toNumber()).to.equal(
          total
        );
      });

      it("should update batch end time", async () => {
        const updateBatchReceipt = await VerumWorldInstance.updateBatchEndTimeForArtistCollection(
          _collectionID,
          endTime,
          { from: artist }
        );
        expect((await VerumWorldInstance.totalSupply(constantTokenID)).toNumber()).to.equal(
          total
        );
      });
    });

    describe("when other user tries to update batch end time", function () {
      it("should not update batch end time", async () => {
        await expectRevert(
          VerumWorldInstance.updateBatchEndTimeForArtistCollection(_collectionID, endTime, { from: george }),
          "VerumWorld: Caller is not the artist"
        );
        expect((await VerumWorldInstance.totalSupply(constantTokenID)).toNumber()).to.equal(
          total
        );
      });
    });
  });

  describe("updateBatchEndTimeAndMintPrice", () => {
    let startTime = Math.floor(new Date() / 1000);
    let endTime = Math.floor(new Date() / 1000) + 27;

    describe("when owner tries to update a batch end time", function () {
      it("should not update the batch for end time less than start time", async () => {
        let wrongEndTime = endTime - 10000;
        await expectRevert(
          VerumWorldInstance.updateBatchEndTimeAndMintPrice(_collectionID, wrongEndTime,mintPrice, { from: artist }),
          "VerumWorld: Batch start time should be less than end time"
        );
        expect((await VerumWorldInstance.totalSupply(constantTokenID)).toNumber()).to.equal(
          total
        );
      });

      it("should not update the batch for less than current time", async () => {
        let wrongEndTime = startTime + 1;
        await expectRevert(
          VerumWorldInstance.updateBatchEndTimeAndMintPrice(_collectionID, wrongEndTime, mintPrice,{ from: artist }),
          "VerumWorld: Batch end time should be greater than current time"
        );
        expect((await VerumWorldInstance.totalSupply(constantTokenID)).toNumber()).to.equal(
          total
        );
      });

      it("should update batch end time", async () => {
        const updateBatchReceipt = await VerumWorldInstance.updateBatchEndTimeAndMintPrice(
          _collectionID,
          endTime,
          mintPrice,
          { from: artist }
        );
        expect((await VerumWorldInstance.totalSupply(constantTokenID)).toNumber()).to.equal(
          total
        );
      });
    });

    describe("when other user tries to update batch end time", function () {
      it("should not update batch end time", async () => {
        await expectRevert(
          VerumWorldInstance.updateBatchEndTimeAndMintPrice(_collectionID, endTime,mintPrice, { from: george }),
          "VerumWorld: Caller is not the artist"
        );
        expect((await VerumWorldInstance.totalSupply(constantTokenID)).toNumber()).to.equal(
          total
        );
      });
    });
  });

  describe("unActiveArtistCollection", () => {
    describe("when other user tries to pause artist collection", () => {
      it("should not pause artist collection", async () => {
        await expectRevert(
          VerumWorldInstance.unActiveArtistCollection(
            _collectionID,
            unpause,
            { from: artist }
          ),
          "Ownable: caller is not the owner"
        );
      });
    });

    describe("when owner tries to pause artist collection", () => {
      it("should not pause artist collection if provided value is same as old one", async () => {
        await expectRevert(
          VerumWorldInstance.unActiveArtistCollection(
            _collectionID,
            pause,
            { from: owner }
          ),
          "VerumWorld: Current state is already what you have selected."
        );
      });

      it("should pause artist collection", async () => {
        await VerumWorldInstance.unActiveArtistCollection(_collectionID, unpause, {
          from: owner
        });

        const newArtistReceipt = await VerumWorldInstance.artistCollections(
          _collectionID
        );
        expect(newArtistReceipt.isPaused).to.equal(true);
      });
    });

    describe("when artist collection is paused", async () => {
      it("should not mint token when artist is paused", async () => {
        const leaf = keccak256(whitelistAddress[3]);
        const proof = merkleTree.getHexProof(leaf);
        await expectRevert(
          VerumWorldInstance.mint(_collectionID, proof, {
            from: steve,
            value: mintPrice,
          }),
          "VerumWorld: Artist is not active with verum world"
        );
      });
      it("should not airdrop token when artist is paused", async () => {
        await expectRevert(
          VerumWorldInstance.airDrop(
            _collectionID,
            [artist, george],
            [1, 1],
            {
              from: artist,
            }),
          "VerumWorld: Artist is not active with verum world"
        );

      });
      it("should not create batch for artist collection", async () => {
        let startTime = Math.floor(new Date() / 1000);
        let endTime = Math.floor(new Date() / 1000) + 1000;
        let merkleHash = merkleTree.getHexRoot();
        await expectRevert(
          VerumWorldInstance.createBatchForArtistCollection(
            _collectionID,
            startTime,
            endTime,
            mintPrice,
            merkleHash,
            { from: artist }
          ),
          "VerumWorld: Artist is not active with verum world"
        );
      });
      it("should not update batch mint price for artist collection", async () => {
        await expectRevert(
          VerumWorldInstance.updateBatchMintPriceForArtistCollection(
            _collectionID,
            mintPrice,
            { from: artist }
          ),
          "VerumWorld: Artist is not active with verum world"
        );
      });
      it("should not update batch end time for artist collection", async () => {
        let endTime = Math.floor(new Date() / 1000) + 1000;
        await expectRevert(
          VerumWorldInstance.updateBatchEndTimeForArtistCollection(
            _collectionID,
            endTime,
            { from: artist }
          ),
          "VerumWorld: Artist is not active with verum world"
        );
      });
      it("should not update maintainer address", async () => {
        await expectRevert(
          VerumWorldInstance.updateMaintainerAddress(_collectionID, user, { from: owner }
          ),
          "VerumWorld: Artist is not active with verum world"
        );
      });
      it("should not update token URI", async () => {
        await expectRevert(
          VerumWorldInstance.updateArtistTokenURI(_collectionID, baseURI2, { from: artist }
          ),
          "VerumWorld: Artist is not active with verum world"
        );
      });
      it("should not burn and mint", async () => {
        await expectRevert(
          VerumWorldInstance.burnAndMint(
            _collectionID,
            baseURI2,
            nullBytes,
            {
              from: artist,
              value: mintPrice,
            }
          ),
          "VerumWorld: Artist is not active with verum world"
        );
      });
      it("should unpause contract", async () => {
        await VerumWorldInstance.unActiveArtistCollection(_collectionID, false, {
          from: owner
        });

        const newArtistReceipt = await VerumWorldInstance.artistCollections(
          _collectionID
        );
        expect(newArtistReceipt.isPaused).to.equal(false);
      });
    });
  });

  describe("updateMaintainerAddress", function () {
    describe("when other user tries to update the maintainer address", function () {
      it("should not update the maintainer address", async () => {
        await expectRevert(
          VerumWorldInstance.updateMaintainerAddress(_collectionID, user, { from: george }),
          "VerumWorld: Caller is neither artist nor owner."
        );
        expect((await VerumWorldInstance.totalSupply(constantTokenID)).toNumber()).to.equal(
          total
        );
      });
    });
    describe("when owner tries to update the maintainer address", function () {
      it("should update the maintainer address", async () => {
        await VerumWorldInstance.updateMaintainerAddress(_collectionID, user, { from: owner });
        const newArtistReceipt = await VerumWorldInstance.artistCollections(
          _collectionID
        );
        expect(newArtistReceipt.maintainerAddress).to.equal(user);
        expect((await VerumWorldInstance.totalSupply(constantTokenID)).toNumber()).to.equal(
          total
        );
      });
      it("should not update the maintainer address if _collectionID does not exists", async () => {
        await expectRevert(
          VerumWorldInstance.updateMaintainerAddress(incorrectCollectionId, user, { from: owner }),
          "VerumWorld: Collection ID does not exists"
        );
        expect((await VerumWorldInstance.totalSupply(constantTokenID)).toNumber()).to.equal(
          total
        );
      });
      it("should not update the maintainer address same as old maintainer address", async () => {
        await expectRevert(
          VerumWorldInstance.updateMaintainerAddress(_collectionID, user, { from: owner }),
          "VerumWorld: The new maintainer address must be different from the old one."
        );
        expect((await VerumWorldInstance.totalSupply(constantTokenID)).toNumber()).to.equal(
          total
        );
      });
    });
    describe("when artist tries to update the maintainer address", function () {

      it("should not update the maintainer address same as old maintainer address", async () => {
        await expectRevert(
          VerumWorldInstance.updateMaintainerAddress(_collectionID, user, { from: user }),
          "VerumWorld: The new maintainer address must be different from the old one."
        );
        expect((await VerumWorldInstance.totalSupply(constantTokenID)).toNumber()).to.equal(
          total
        );
      });
      it("should not update the maintainer address if _collectionID does not exists", async () => {
        await expectRevert(
          VerumWorldInstance.updateMaintainerAddress(incorrectCollectionId, artist, { from: user }),
          "VerumWorld: Caller is neither artist nor owner."
        );
        expect((await VerumWorldInstance.totalSupply(constantTokenID)).toNumber()).to.equal(
          total
        );
      });
      it("should update the maintainer address", async () => {
        await VerumWorldInstance.updateMaintainerAddress(_collectionID, artist, { from: user });
        const newArtistReceipt = await VerumWorldInstance.artistCollections(
          _collectionID
        );
        expect(newArtistReceipt.maintainerAddress).to.equal(artist);
        expect((await VerumWorldInstance.totalSupply(constantTokenID)).toNumber()).to.equal(
          total
        );
      });
    });
  });

  describe("updateArtistTokenURI", function () {
    describe("when other user tries to update the token URI", function () {
      it("should not update the token URI", async () => {
        await expectRevert(
          VerumWorldInstance.updateArtistTokenURI(_collectionID, baseURI2, { from: george }),
          "VerumWorld: Caller is not the artist"
        );
        expect((await VerumWorldInstance.totalSupply(constantTokenID)).toNumber()).to.equal(
          total
        );
      });
    });
    describe("when artist tries to update the token URI", function () {
      it("should not update the token URI same as old token URI", async () => {
        await expectRevert(
          VerumWorldInstance.updateArtistTokenURI(_collectionID, baseURI1, { from: artist }),
          "VerumWorld: New token URI must be different from old URI"
        );
        expect((await VerumWorldInstance.totalSupply(constantTokenID)).toNumber()).to.equal(
          total
        );
      });
      it("should update the token URI", async () => {
        await VerumWorldInstance.updateArtistTokenURI(_collectionID, baseURI2, { from: artist });
        const artistReceipt = await VerumWorldInstance.artistCollections(
          _collectionID
        );
        const newURIReceipt = await VerumWorldInstance.tokenURI(
          artistReceipt.allocatedTokenID
        );
        expect(newURIReceipt).to.equal(baseURI2);
        expect((await VerumWorldInstance.totalSupply(constantTokenID)).toNumber()).to.equal(
          total
        );
      });
    });
  });

  describe("mint", () => {
    describe("When whitelist user tries to mint", () => {
      const leaf = keccak256(whitelistAddress[3]);
      const proof = merkleTree.getHexProof(leaf);
      it("should mint token", async () => {
        let tokenReceipt = await VerumWorldInstance.mint(_collectionID, proof, {
          from: steve,
          value: mintPrice,
        });
        await expectEvent(tokenReceipt, EventNames.NewNFTCreated, {
          tokenId: new BN(index),
        });
        total++;
        index++;
        steveSupplyCount++;
        expect((await VerumWorldInstance.totalSupply(constantTokenID)).toNumber()).to.equal(
          total
        );
        expect((await VerumWorldInstance.balanceOf(steve, constantTokenID)).toNumber()).to.equal(
          steveSupplyCount
        );
        
      });

      it("should not mint token if whitelist user already minted", async () => {
        await expectRevert(
          VerumWorldInstance.mint(_collectionID, proof, {
            from: steve,
            value: mintPrice,
          }),
          "VerumWorld: Whitelisted user already minted for current batch."
        );
        expect((await VerumWorldInstance.totalSupply(constantTokenID)).toNumber()).to.equal(
          total
        );
        expect((await VerumWorldInstance.balanceOf(steve, constantTokenID)).toNumber()).to.equal(
          steveSupplyCount
        );
        
      });

      it("should not mint token for wrong mint price", async () => {
        const incorrectMintPrice = toWei("0.01", "ether");
        await expectRevert(
          VerumWorldInstance.mint(_collectionID, proof, {
            from: steve,
            value: incorrectMintPrice,
          }),
          "VerumWorld: Incorrect ETH value"
        );
        expect((await VerumWorldInstance.totalSupply(constantTokenID)).toNumber()).to.equal(
          total
        );
        expect((await VerumWorldInstance.balanceOf(steve, constantTokenID)).toNumber()).to.equal(
          steveSupplyCount
        );
        
      });

      it("should not mint token for wrong merkel proof", async () => {
        await expectRevert(
          VerumWorldInstance.mint(_collectionID, merkleHashArtist, {
            from: george,
            value: mintPrice,
          }),
          "VerumWorld: MerkleDistributor Invalid proof."
        );
        expect((await VerumWorldInstance.totalSupply(constantTokenID)).toNumber()).to.equal(
          total
        );
        expect((await VerumWorldInstance.balanceOf(steve, constantTokenID)).toNumber()).to.equal(
          steveSupplyCount
        );
        
      });
    });
  });

  describe("airdrop", () => {
    describe("When other user tries to airdrop", () => {
      it("should not airdrop token", async () => {
        await expectRevert(
          VerumWorldInstance.airDrop(_collectionID, [artist, george], [1, 1], { from: user }),
          "VerumWorld: Caller is not the artist"
        );
        
      });
    });
    describe("When artist tries to airdrop", () => {
      it("should airdrop token", async () => {
        await VerumWorldInstance.airDrop(
          _collectionID,
          [artist, george],
          [1, 1],
          {
            from: artist,
          }
        );
        correctAirdropedTokenId = total;
        total = total + 2;
        index = index + 2
        expect((await VerumWorldInstance.totalSupply(constantTokenID)).toNumber()).to.equal(
          total
        );
      });
      it("should not airdrop token for incorrect parameter", async () => {
        await expectRevert(
          VerumWorldInstance.airDrop(_collectionID, [artist, steve], [1], { from: artist }),
          "VerumWorld: Incorrect parameter length"
        );
      });
    });
  });

  describe("burnAndMint", () => {
    it("should not burn and mint token if caller does not have enough token", async () => {
      await expectRevert(
        VerumWorldInstance.burnAndMint(
          _collectionID,
          baseURI2,
          nullBytes,
          {
            from: nonWhiteListUser,
            value: mintPrice,
          }),
        "ERC1155: burn amount exceeds balance"
      );
    });

    it("should burn contract 2 token and mint contract 3 token", async () => {
      let tokenReceipt = await VerumWorldInstance.burnAndMint(
        _collectionID,
        baseURI2,
        nullBytes,
        {
          from: artist,
          value: mintPrice,
        }
      );
      avatartotal++;
      total--;
      expect((await mustafaCeceliInstance.totalSupply(constantTokenID)).toNumber()).to.equal(avatartotal);
      expect((await VerumWorldInstance.balanceOf(artist, constantTokenID)).toNumber()).to.equal(0);
      expect((await mustafaCeceliInstance.balanceOf(artist, constantTokenID)).toNumber()).to.equal(1);
    })
  });

  describe("uri", () => {
    describe("When other user tries to get uri", () => {
      it("should not get uri for nonexistent token", async () => {
        await expectRevert(
          VerumWorldInstance.uri(constantTokenID + 1, { from: george }),
          "VerumWorld: URI nonexistent token"
        );
        
      });

      it("should get uri for existent token", async () => {
        expect(await VerumWorldInstance.uri(constantTokenID)).to.equal(baseURI2);
      });
    });
  });

  describe("withdrawToAddress", () => {
    describe("When other user tries to withdraw to address", () => {
      it("should not withdraw balance to address", async () => {
        await expectRevert(
          VerumWorldInstance.withdrawToAddress(_collectionID, user, { from: george }),
          "VerumWorld: Caller is not the artist"
        );
        
      });
    });

    describe("When owner tries to withdraw to address", () => {
      it("should withdraw balance to address", async () => {
        let contractAddress = await VerumWorldInstance.address;
        let initialContractBalance = fromWei(
          await web3.eth.getBalance(contractAddress),
          "ether"
        );
        
        const withdrawRecept = await VerumWorldInstance.withdrawToAddress(
          _collectionID,
          steve,
          {
            from: artist,
          }
        );

        let balanceAfterWithdraw = fromWei(
          await web3.eth.getBalance(contractAddress),
          "ether"
        );

        if (initialContractBalance > 0) {
          expect(balanceAfterWithdraw).to.equal("0");
        }
      });

      it("should not withdraw if artist does not have balance", async () => {
        await expectRevert(
          VerumWorldInstance.withdrawToAddress(_collectionID, user, { from: artist }),
          "VerumWorld: The artist has insufficient  balance to withdraw."
        );
        
      });

      it("should not withdraw to zero address", async () => {
        await expectRevert(
          VerumWorldInstance.withdrawToAddress(_collectionID, constants.ZERO_ADDRESS, { from: artist }),
          "VerumWorld: Cannot withdraw to Zero Address"
        );
        
      });

    });
  });

  describe("safeTransferFrom", () => {
    describe("when user tries to transfer airdroped token", async () => {
      it("should not transfer airdropped token", async () => {
        await expectRevert(
          VerumWorldInstance.safeTransferFrom(george, artist, 0, 1, 0x0,
            {
              from: george,
            }),
          "VerumWorld: The tokens are airdropped and cannot be transferred"
        );
      });
    });
  });

  after(() => {
    VerumWorldInstance = null;
  });
});
