// SPDX-License-Identifier: MIT
pragma solidity ^0.8.7;

/**
 * @dev Interface of the Utility token implementation.
 * @author The Systango Team
 */

interface IVerumWorld {

    // The event emitted when new Base URI is set
    event BaseURIUpdated (string newURI);

    // The event emitted when new token is minted
    event NewNFTCreated (uint tokenId);

    // The event emitted when a new batch is created
    event NewBatchCreated (string batchIndex);

    /**
     * @dev Mint a new NFT 
     */
    function mint(string memory collectionID, bytes32[] calldata merkleProof) external payable;

    /**
     * @dev Airdrop the NFTs to assigned address by the owner
     */
    function airDrop(string memory collectionID, address[] memory assigned, uint16[] memory quantity) external;
  
    /**
     * @dev Add a new Artist 
     */
    function addNewArtistCollection(address artistOwner, address contractAddress, string memory collectionID, string memory uri) external;

    /**
     * @dev Pause artist collection 
     */
    function unActiveArtistCollection(string memory collectionID, bool pauseBoolean) external;

    /**
     * @dev Add a new batch for Artist 
     */
    function createBatchForArtistCollection(string memory collectionID, uint256 startTime, uint256 endTime, uint256 mintPrice, bytes32 merkleHash) external;
    
    /**
     * @dev Update the current batch mint price of the artist collection
     */
    function updateBatchMintPriceForArtistCollection(string memory collectionID, uint256 mintPrice) external;
    
    /**
     * @dev Update the current batch end time of the artist collection
     */
    function updateBatchEndTimeForArtistCollection(string memory collectionID, uint256 endTime) external;

    /**
     * @dev Update the current batch end time and mintprice of the artist collection
     */
    function updateBatchEndTimeAndMintPrice(string memory collectionID, uint256 endTime, uint256 mintPrice) external;

    /**
     * @dev Update the maintainer address of the artist collection
     */
    function updateMaintainerAddress(string memory collectionID, address newMaintainerAddress) external;
 
    /**
     * @dev Update the Token URI of the artist collection
     */
    function updateArtistTokenURI(string memory collectionID, string memory artistNewTokenURI) external;

    /**
     * @dev Burn the artist tokens for user's avatar
     */
    function burnAndMint(string memory collectionID, string memory avatarUri, bytes memory data) payable external;

    /**
     * @dev Withdraw ethers to a specific address in the contract by the artist
     */
    function withdrawToAddress(string memory collectionID, address payable account) external;
}