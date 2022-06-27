// SPDX-License-Identifier: MIT
pragma solidity ^0.8.7;

/**
* @title ERC1155 token for VerumWorld
* @author The Systango Team
*/

import "@openzeppelin/contracts-upgradeable/utils/cryptography/MerkleProofUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/utils/StringsUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/utils/CountersUpgradeable.sol";

import "./AbstractERC1155Factory.sol";
import "./IArtistCollectibles.sol";

contract VerumWorld is AbstractERC1155Factory {
    
    using CountersUpgradeable for CountersUpgradeable.Counter;

    CountersUpgradeable.Counter internal nextArtistIndex;

    // Zero Address
    address constant ZERO_ADDRESS = address(0);

    // Null bytes32 value
    bytes32 constant NULL_BYTES = 0x0000000000000000000000000000000000000000000000000000000000000000;

    // Token Uri mapping  correspond to token id
    mapping(uint => string) public tokenURI;

    // Mapping of batch index counter for every artist collection
    mapping(string => uint256) public batchIndex;

    // Mapping of user address has claimed or not for artist id to its active batch
    mapping(uint256 => mapping(uint256 => mapping(address => bool))) public whitelistClaimed;

    // Mapping of token amount that are airdropped to any account for an artist
    mapping(uint256 => mapping(address => uint256)) public airDroppedTokens;

    // Mapping of artist id to artist collections
    mapping(string => ArtistCollection) public artistCollections;     

    // Mapping of artist id to artist eligible withdrawal balance
    mapping(string => uint256) private artistBalance;  

    // Struct of batch for each artist 
    struct Batch { 
        uint256 startTime;
        uint256 endTime;
        uint256 mintPrice;
        bytes32 merkleHash;
    }

    // Struct of artist collection
    struct ArtistCollection {
        address maintainerAddress;
        address artistContractAddress;
        string collectionID;
        uint256 allocatedTokenID;
        bool isPaused;
        Batch activeBatch;
    }

    function initialize(
        string memory tokenName,
        string memory tokenSymbol
    ) initializer external {
        name_ = tokenName;
        symbol_ = tokenSymbol;
        __Ownable_init();
        __ReentrancyGuard_init();
        __ERC1155Supply_init();
    }

    /// @dev This is the token mint function. This would mint a token  and would except coins to buy the token.
    /// @param collectionID The collectionId of the artist whoes token should be minted.
    /// @param merkleProof The merkle proof provided for checking the whitelist address claimed for the batch

    function mint(string memory collectionID, bytes32[] calldata merkleProof) external payable override nonReentrant {
        address callerAddress = _msgSender();
        ArtistCollection memory artistCollection = artistCollections[collectionID];
        uint256 artistID = artistCollection.allocatedTokenID;
        require(artistCollection.isPaused != true , "VerumWorld: Artist is not active with verum world"); 
        Batch memory activeBatch = artistCollection.activeBatch;
        uint256 batchArrayIndex = batchIndex[collectionID];
        bool privateRound = false;
        bool privateClaimableAddress = false;
        require(block.timestamp < activeBatch.endTime && block.timestamp > activeBatch.startTime, "VerumWorld: Currently no batch is active");
        require(activeBatch.mintPrice <= msg.value, "VerumWorld: Incorrect ETH value");
        if(activeBatch.merkleHash != NULL_BYTES){
            privateRound = true;
            privateClaimableAddress = whiteListAddressCheck(artistID, callerAddress, merkleProof, batchArrayIndex, activeBatch);
        }
        if(privateRound && privateClaimableAddress)
            whitelistClaimed[artistID][batchArrayIndex][callerAddress] = true;
        artistBalance[collectionID] += uint256(msg.value);
        _mint(callerAddress, artistID, 1, "");
        emit NewNFTCreated(artistID);
    }

    /// @dev This is the token mint sanity check function. This would check for all the requirements before the NFT minting
    /// @param artistID The unique id of the artist collection
    /// @param callerAddress The caller adddress of this function
    /// @param merkleProof The merkle proof provided for checking the whitelist address claimed for the batch
    /// @param artistBatchIndex The current index of the artist batch
    /// @param activeBatch The data of the active batch

    function whiteListAddressCheck(uint256 artistID, address callerAddress, bytes32[] calldata merkleProof, uint256 artistBatchIndex, Batch memory activeBatch) internal view returns (bool) {
        require(!whitelistClaimed[artistID][artistBatchIndex][callerAddress], "VerumWorld: Whitelisted user already minted for current batch");
        bytes32 leaf = keccak256(abi.encodePacked(callerAddress));
        require(
            MerkleProofUpgradeable.verify(merkleProof, activeBatch.merkleHash, leaf),
            "VerumWorld: MerkleDistributor Invalid proof."
        );
        return true;
    }

    /// @dev This is the airDrop function. It is used by the owner to airdrop `quantity` number of random tokens to the `assigned` address respectively.
    /// @dev Only the owner can call this function
    /// @param collectionID The collectionID of the artist
    /// @param assigned The address to be air dropped
    /// @param quantity The amount of random tokens to be air dropped

    function airDrop(string memory collectionID, address[] memory assigned, uint16[] memory quantity) external override onlyArtist(collectionID) {
        require(assigned.length == quantity.length, "VerumWorld: Incorrect parameter length");
        ArtistCollection memory artistCollection = artistCollections[collectionID];
        require(artistCollection.isPaused != true , "VerumWorld: Artist is not active with verum world");
        uint256 batchID = artistCollection.allocatedTokenID;
        for (uint8 index = 0; index < assigned.length; index++) {
                airDroppedTokens[batchID][assigned[index]] += quantity[index];
                _mint(assigned[index], batchID, quantity[index], "");
        }
    }

    /// @dev This is the addNewArtistCollection function. It is used by the owner to add new artist to artistCollection.
    /// @dev Only the owner can call this function
    /// @param maintainerAddress The address of the artist
    /// @param contractAddress The contract address of the artist
    /// @param collectionID The unique ID of the artist 
    /// @param artistTokenURI The metadata uri associated with that artist token 

    function addNewArtistCollection(address maintainerAddress, address contractAddress, string memory collectionID, string memory artistTokenURI) external override onlyOwner {
        require(keccak256(bytes(artistCollections[collectionID].collectionID)) != keccak256(bytes(collectionID)),"VerumWorld: Collection id already exists");
        uint256 currentArtistIndex = uint256(nextArtistIndex.current());
        ArtistCollection memory artistCollection;
        artistCollection.maintainerAddress = maintainerAddress;
        artistCollection.artistContractAddress = contractAddress;
        artistCollection.collectionID = collectionID;
        artistCollection.allocatedTokenID = currentArtistIndex;
        artistCollection.isPaused = false;     
        artistCollections[collectionID] = artistCollection;
        tokenURI[currentArtistIndex] = artistTokenURI;
        nextArtistIndex.increment();
    }

    /// @dev This is the unActiveArtistCollection function. It is used by the owner to pause the artist collection.
    /// @dev Only the owner can call this function
    /// @param collectionID The unique ID of the artist 
    /// @param pauseBoolean This whould be true or false  

    function unActiveArtistCollection(string memory collectionID, bool pauseBoolean) external override onlyOwner {
        ArtistCollection storage artistCollection = artistCollections[collectionID];
        require(artistCollection.isPaused != pauseBoolean , "VerumWorld: Current state is already what you have selected.");
        artistCollection.isPaused = pauseBoolean;
    }

    /// @dev This is the addBatch function. It is used by the owner to set a new batch with the start and end time with the respective batch price.
    /// @dev Only the owner can call this function
    /// @param collectionID The collectionID of the artist
    /// @param startTime The start time of the batch
    /// @param endTime The end time of the batch
    /// @param mintPrice The mint price of the batch
    /// @param merkleHash The merkle hash of the whitelisted addresses

    function createBatchForArtistCollection(string memory collectionID, uint256 startTime, uint256 endTime, uint256 mintPrice, bytes32 merkleHash) external override onlyArtist(collectionID) {
        require(startTime < endTime, "VerumWorld: Batch start time should be less than end time");
        require(block.timestamp < endTime, "VerumWorld: New Batch end time should be greater than current time");
        require(mintPrice > 0, "VerumWorld: New Batch mint price should be greater than zero");
        Batch memory batch = Batch(startTime, endTime, mintPrice, merkleHash);
        ArtistCollection storage artistCollection = artistCollections[collectionID];
        require(artistCollection.isPaused != true , "VerumWorld: Artist is not active with verum world");
        artistCollection.activeBatch = batch;
        batchIndex[collectionID]++;
        emit NewBatchCreated(artistCollection.collectionID);
    }

    /// @dev This is the updateCurrentBatch function. It is used by the owner to update the current batch mint price.
    /// @dev Only the owner can call this function
    /// @param collectionID The collectionID of the artist
    /// @param mintPrice The new mintprice of the current batch

    function updateBatchMintPriceForArtistCollection(string memory collectionID, uint256 mintPrice) external override onlyArtist(collectionID) {
        ArtistCollection storage artistCollection = artistCollections[collectionID];
        require(artistCollection.isPaused != true , "VerumWorld: Artist is not active with verum world");
        require(mintPrice > 0, "VerumWorld: Batch mint price should be greater than zero");
        require(block.timestamp < artistCollection.activeBatch.endTime, "VerumWorld: Batch time has passed.");
        artistCollection.activeBatch.mintPrice = mintPrice;
    }

    /// @dev This is the updateCurrentBatch function. It is used by the owner to update the current batch end time.
    /// @dev Only the owner can call this function
    /// @param collectionID The collectionID of the artist
    /// @param endTime The new end time of the current batch

    function updateBatchEndTimeForArtistCollection(string memory collectionID, uint256 endTime) external override onlyArtist(collectionID) {
        ArtistCollection storage artistCollection = artistCollections[collectionID];
        require(artistCollection.isPaused != true , "VerumWorld: Artist is not active with verum world");
        require(block.timestamp < artistCollection.activeBatch.endTime, "VerumWorld: Batch time has passed.");
        require(artistCollection.activeBatch.startTime < endTime, "VerumWorld: Batch start time should be less than end time");
        require(block.timestamp < endTime, "VerumWorld: Batch end time should be greater than current time");
        artistCollection.activeBatch.endTime = endTime;
    }

    /// @dev This is the updateCurrentBatch function. It is used by the owner to update the current batch end time and mint price.
    /// @dev Only the owner can call this function
    /// @param collectionID The collectionID of the artist
    /// @param endTime The new end time of the current batch
    /// @param mintPrice The new mint price of the current batch

    function updateBatchEndTimeAndMintPrice(string memory collectionID, uint256 endTime, uint256 mintPrice) external override onlyArtist(collectionID) {
        ArtistCollection storage artistCollection = artistCollections[collectionID];
        require(artistCollection.isPaused != true , "VerumWorld: Artist is not active with verum world");
        require(mintPrice > 0, "VerumWorld: Batch mint price should be greater than zero");
        require(block.timestamp < artistCollection.activeBatch.endTime, "VerumWorld: Batch time has passed.");
        require(artistCollection.activeBatch.startTime < endTime, "VerumWorld: Batch start time should be less than end time");
        require(block.timestamp < endTime, "VerumWorld: Batch end time should be greater than current time");
        artistCollection.activeBatch.endTime = endTime;
        artistCollection.activeBatch.mintPrice = mintPrice;
    }

    /// @dev This is the updateMaintainerAddress function. It is used by the owner or artist to update the maintainer address in artist collection.
    /// @dev Only the owner or artist can call this function
    /// @param collectionID The unique ID of the artist 
    /// @param newMaintainerAddress New maintainer address for the artist collection 

    function updateMaintainerAddress(string memory collectionID, address newMaintainerAddress) external override onlyAdmins(collectionID) {
        ArtistCollection storage artistCollection = artistCollections[collectionID];
        require(keccak256(bytes(artistCollection.collectionID)) == keccak256(bytes(collectionID)),"VerumWorld: Collection ID does not exists");
        require(artistCollection.maintainerAddress != newMaintainerAddress,"VerumWorld: The new maintainer address must be different from the old one.");
        require(artistCollection.isPaused != true , "VerumWorld: Artist is not active with verum world");
        artistCollection.maintainerAddress = newMaintainerAddress;
    }

    /// @dev This is the updateArtistTokenURI function. It is used by the artist to update the token URI in artist collection.
    /// @dev Only the artist can call this function
    /// @param collectionID The unique ID of the artist 
    /// @param artistNewTokenURI New artist token URI for the artist collection 

    function updateArtistTokenURI(string memory collectionID, string memory artistNewTokenURI) external override onlyArtist(collectionID) {
        ArtistCollection storage artistCollection = artistCollections[collectionID];
        require(keccak256(bytes(artistCollection.collectionID)) == keccak256(bytes(collectionID)),"VerumWorld: Collection ID does not exists");
        require(keccak256(bytes(tokenURI[artistCollection.allocatedTokenID])) != keccak256(bytes(artistNewTokenURI)),"VerumWorld: New token URI must be different from old URI");
        require(artistCollection.isPaused != true , "VerumWorld: Artist is not active with verum world");
        tokenURI[artistCollection.allocatedTokenID] = artistNewTokenURI;
    }

    /// @dev This is the burnAndMint function. It is used for burning this contract token and mint your avatar as an nft from another contract.
    /// @param collectionID The unique ID of the artist 
    /// @param avatarUri Avatar Uri is the metadata of your avtar
    /// @param data Avatar data for any extra use

    function burnAndMint(string memory collectionID, string memory avatarUri, bytes calldata data) payable external override nonReentrant {
        ArtistCollection memory artistCollection = artistCollections[collectionID];
        require(artistCollection.isPaused != true , "VerumWorld: Artist is not active with verum world");
        IArtistCollectibles iartistcol = IArtistCollectibles(artistCollection.artistContractAddress);
        require(iartistcol.getMintPrice() <= msg.value, "VerumWorld: Insufficient ether value supplied");
        _burn(_msgSender(), artistCollection.allocatedTokenID, 1); 
        iartistcol.mint{value:msg.value}(_msgSender(), avatarUri, data);
    }

    /// @dev This is the withdrawToAddress function. It is used by artist to withdraw his collection balance.
    /// @dev This function can only be called by artist.
    /// @param collectionID The unique ID of the artist 
    /// @param account The account in which artist want to withdraw the balance

    function withdrawToAddress(string memory collectionID, address payable account) external override onlyArtist(collectionID) nonReentrant {
        require(account != ZERO_ADDRESS, "VerumWorld: Cannot withdraw to Zero Address");
        uint256 artistWithdrawableBalance =  artistBalance[collectionID];
        require(artistWithdrawableBalance > 0, "VerumWorld: The artist has insufficient  balance to withdraw.");
        artistBalance[collectionID] = 0;
        payable(account).transfer(artistWithdrawableBalance);
    }

    /// @dev This is the uri function. It is used by any user to get the uri/metadata of the given tokenID.
    /// @param id The unique ID of the artist 
   
    function uri(uint id) public view override returns (string memory) {
        require(exists(id), "VerumWorld: URI nonexistent token");
        return tokenURI[id];
    }

    modifier onlyArtist(string memory collectionID) {
        ArtistCollection memory artistCollection = artistCollections[collectionID];
        address artistAddress =  artistCollection.maintainerAddress;
        require(artistAddress == _msgSender() , "VerumWorld: Caller is not the artist");
        _;
    }

    modifier onlyAdmins(string memory collectionID) {
        ArtistCollection memory artistCollection = artistCollections[collectionID];
        address artistAddress =  artistCollection.maintainerAddress;
        require(artistAddress == _msgSender() || owner()== _msgSender() , "VerumWorld: Caller is neither artist nor owner.");
        _;
    }

    function _beforeTokenTransfer(
        address operator,
        address from,
        address to,
        uint256[] memory ids,
        uint256[] memory amounts,
        bytes memory data
    ) internal virtual override {
        if(to != ZERO_ADDRESS && from != ZERO_ADDRESS){
            for (uint8 i = 0; i < ids.length; i++) {
                require(
                    balanceOf(from, ids[i]) > airDroppedTokens[ids[i]][from],
                    "VerumWorld: The tokens are airdropped and cannot be transferred"
                );
            }
        }
        super._beforeTokenTransfer(operator, from, to, ids, amounts, data);
    }  
}