// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/metatx/ERC2771Context.sol";
import "@openzeppelin/contracts/metatx/ERC2771Forwarder.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";

contract Registry is ERC2771Context {
    using SafeERC20 for IERC20;
    event Registered(address indexed who, string name);
    event TransferToken(
        address token,
        address from,
        address to,
        uint256 amount
    );

    mapping(address => string) public names;
    mapping(string => address) public owners;

    constructor(
        ERC2771Forwarder forwarder // Initialize trusted forwarder
    ) ERC2771Context(address(forwarder)) {}

    function register(string memory name) external {
        require(owners[name] == address(0), "Name taken");
        address owner = _msgSender(); // Changed from msg.sender
        owners[name] = owner;
        names[owner] = name;
        emit Registered(owner, name);
    }

    function transferToken(address token, address to, uint256 amount) external {
        // Transfer ERC20 tokens
        IERC20(token).safeTransfer(to, amount);
        emit TransferToken(token, _msgSender(), to, amount);
    }
    function transferFromToken(
        address token,
        address from,
        address to,
        uint256 amount
    ) external {
        // Transfer ERC20 tokens
        IERC20(token).safeTransferFrom(from, to, amount);
        emit TransferToken(token, from, to, amount);
    }
}
