// SPDX-License-Identifier: MIT

pragma solidity ^0.8.7;

/**
 * @dev Interface of the Mersmeta token implementation.
 */

interface IArtistCollectibles {

    // The event emitted when new token is minted
    event NewAvatarCreated(uint tokenId);

    // The event emitted when new token is minted
    event NewMintPriceSet(uint newPrice);

    /**
     * @dev Mint a new NFT 
     */
    function mint(address account, string memory avatarURI, bytes calldata data) external payable;

    /**
     * @dev Get the mint for the avatar creation
     */
    function getMintPrice() external view returns(uint256);

    /**
     * @dev Set the mint for the avatar creation
     */
    function setMintPrice(uint256 collectiblesPrice) external;

    /**
     * @dev Get the Base URI 
     */
    function uri(uint256 id) external view returns (string memory);

}