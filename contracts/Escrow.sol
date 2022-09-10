// SPDX-License-Identifier: MIT
pragma solidity >=0.5.0 <0.9.0;

// it is skeleton of smart contract that shows what fn is without showing the whole fn
// we can import the fn that we care about
interface IERC721 {
    function transferFrom(address _from, address _to, uint _id) external;
}

contract Escrow{
    address public nftAddress;
    uint public nftId;
    uint public purchasePrice;
    // amt that buyer will give to escrow contract as down payment
    uint public escrowAmt;
    // payable - they can receive crypto funds
    address payable public seller;
    address payable public buyer;
    address public inspector;
    address public lender;
    
    modifier onlyBuyer() {
        require(msg.sender == buyer, "Only buyer can call this fn");
        _;
    }
    modifier onlyInspector() {
        require(msg.sender == inspector, "Only inspector can call this fn");
        _;
    }

    bool public inspectionPassed = false;
    mapping(address => bool) public approval;

    receive() external payable {}

    constructor(
        address _nftAddress, 
        uint _nftId, 
        uint _purchasePrice,
        uint _escrowAmt,
        address payable _seller, 
        address payable _buyer,
        address _inspector,
        address _lender
    ){
        nftAddress = _nftAddress;
        nftId = _nftId;
        purchasePrice = _purchasePrice;
        escrowAmt = _escrowAmt;
        seller = _seller;
        buyer = _buyer;
        inspector = _inspector;
        lender = _lender;
    }

    // receive the ETH into the contract from buyer (down payment)
    function depositEarnest() public payable onlyBuyer{
        // so that buyer sends amount equal to escrowAmt to the contract and not less down payment
        require(msg.value >= escrowAmt);
       
    }

    // check balance of escrow
    function getBalance() public view returns(uint){
        return address(this).balance;
    }
    
    function inspectionStatus(bool _passed) public onlyInspector{
        inspectionPassed = _passed;
    }

    function approveSale() public{
        approval[msg.sender] = true;
    }

    // cancel the sale (handle the earnest deposit by the buyer)
    function cancelSale() public{
        if(inspectionPassed == false){
            payable(buyer).transfer(address(this).balance);
        }
        else{
            payable(seller).transfer(address(this).balance);
        }
    }

    function finalizeSale() public{
        // so that inspection is passed before finalize the sale and transfer ownership 
        require(inspectionPassed, "Must pass the inspection of the property");
        // approval of all for the sale
        require(approval[buyer],"must be approved by buyer");
        require(approval[seller],"must be approved by seller");
        require(approval[lender],"must be approved by lender");
        require(address(this).balance >= purchasePrice, "Must have enough ether for sale");

        // transfer funds to seller
        (bool success, ) = payable(seller).call{value: address(this).balance }("");
        require(success);

        // transfer ownership from buyer to seller
        IERC721(nftAddress).transferFrom(seller, buyer, nftId);
    }   
}