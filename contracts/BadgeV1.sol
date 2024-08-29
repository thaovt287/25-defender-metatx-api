// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {Base} from "./base/Base.sol";
import {Validation, BoolUtils} from "./libs/Utils.sol";
import "@openzeppelin/contracts-upgradeable/token/ERC1155/ERC1155Upgradeable.sol";
import "@openzeppelin/contracts-upgradeable/token/ERC1155/extensions/ERC1155PausableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/token/ERC1155/extensions/ERC1155BurnableUpgradeable.sol";
import "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";
import "@openzeppelin/contracts-upgradeable/utils/cryptography/EIP712Upgradeable.sol";

// EIP712,
contract BadgeV1 is
    ERC1155Upgradeable,
    ERC1155PausableUpgradeable,
    ERC1155BurnableUpgradeable,
    EIP712Upgradeable,
    Base
{
    using ECDSA for bytes32;

    struct MintBadgeData {
        address adminWallet;
        address to;
        uint256 idBadge;
        uint256 idToken;
        bytes signature;
    }

    bytes32 internal constant _MINT_DATA_TYPEHASH =
        keccak256(
            "MintBadgeData(address adminWallet, address to, uint256 idBadge, uint256 idToken)"
        );

    address public _adminAddress;
    mapping(uint256 => bytes32) public minters;

    event MintBadgeAdded(uint256 idBadge, uint256 idToken, address to);
    /**
     * @dev The request `adminAddress` doesn't match with the recovered `signer`.
     */
    error InvalidSigner(address signer, address adminAddress);
    error BadgeMinted(uint256 idBadge, uint256 idToken);

    function initialize(
        address initialAdmin,
        address adminAddress,
        string calldata name,
        string calldata version
    ) external initializer {
        Validation.noZeroAddress(initialAdmin);
        Validation.noZeroAddress(adminAddress);

        __Base_init(initialAdmin);
        __EIP712_init(name, version);

        _adminAddress = adminAddress;
    }

    function mint(MintBadgeData calldata request) public whenNotPaused {
        (bool signerMatch, address signer) = _validate(request);
        if (!signerMatch) {
            revert InvalidSigner(signer, _adminAddress);
        }
        addMinted(request.idBadge, request.idToken);
        _mint(request.to, request.idToken, 1, "");

        emit MintBadgeAdded(request.idBadge, request.idToken, request.to);
    }

    function _validate(
        MintBadgeData calldata request
    ) internal view virtual returns (bool signerMatch, address signer) {
        address recovered = _recoverSigner(request);

        return (recovered == _adminAddress, recovered);
    }

    function _recoverSigner(
        MintBadgeData calldata request
    ) internal view virtual returns (address recovered) {
        bytes32 digest = _hashTypedDataV4(
            keccak256(
                abi.encode(
                    _MINT_DATA_TYPEHASH,
                    request.adminWallet,
                    request.to,
                    request.idBadge,
                    request.idToken
                )
            )
        );

        return ECDSA.recover(digest, request.signature);
    }

    function addMinted(uint256 idBadge, uint256 idToken) internal {
        if (BoolUtils.bytes32ToBool(minters[idBadge])) {
            revert BadgeMinted(idBadge, idToken);
        }
        minters[idBadge] = BoolUtils.toBytes32(true);
    }

    function supportsInterface(
        bytes4 interfaceId
    ) public view virtual override(Base, ERC1155Upgradeable) returns (bool) {
        return super.supportsInterface(interfaceId);
    }

    function _update(
        address from,
        address to,
        uint256[] memory ids,
        uint256[] memory values
    )
        internal
        virtual
        override(ERC1155Upgradeable, ERC1155PausableUpgradeable)
        whenNotPaused
    {
        super._update(from, to, ids, values);
    }
}
