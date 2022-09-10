const {ethers} = require('hardhat');
const {expect} = require('chai');

const tokens = (n)=>{
    return ethers.utils.parseUnits(n.toString(),'ether');
}
const ether = tokens;

describe('RealEstate', () =>{
    let realEstate, escrow
    let deployer, seller, buyer, inspector, lender
    let nftId = 1
    let purchasePrice = ether(100)
    let escrowAmt = ether(20)

    beforeEach(async()=>{
        // setup the accounts
        accounts = await ethers.getSigners();
        deployer = accounts[0];
        seller = deployer;
        buyer = accounts[1];
        inspector = accounts[2];
        lender = accounts[3];

        // load contracts
        const RealEstate = await ethers.getContractFactory('RealEstate');
        const Escrow = await ethers.getContractFactory('Escrow');

        // deploy contracts
        realEstate = await RealEstate.deploy();
        escrow = await Escrow.deploy(
            realEstate.address, 
            nftId, 
            purchasePrice,
            escrowAmt,
            seller.address, 
            buyer.address,
            inspector.address,
            lender.address
        );

        // Now seller must approve before calling the transferFrom fn
        transaction = await realEstate.connect(seller).approve(escrow.address, nftId);
        await transaction.wait();
    })

    describe('Deployment', ()=>{
        it('sends an nft to the seller', async()=>{
            expect(await realEstate.ownerOf(nftId)).to.equal(seller.address);
        })
    })
    describe('Selling a real estate', ()=>{
        it('executes successful transaction', async()=>{
            let balance, transaction
            // expects seller to be owner before the sale
            expect(await realEstate.ownerOf(nftId)).to.equal(seller.address);

            // check escrow balance before deposit
            balance = await escrow.getBalance();
            console.log("Escrow balance before deposit: ", ethers.utils.formatEther(balance));

            // buyer deposits the earnest
            transaction = await escrow.connect(buyer).depositEarnest({ value: escrowAmt });
            await transaction.wait();

            // check escrow balance after the deposit
            balance = await escrow.getBalance();
            console.log("Escrow balance after deposit: ", ethers.utils.formatEther(balance));

            // check inspection status
            transaction = await escrow.connect(inspector).inspectionStatus(true);
            await transaction.wait();
            console.log("Inspector updates the status");

            // buyer approves the sale
            transaction = await escrow.connect(buyer).approveSale();
            await transaction.wait();
            console.log("Buyer approves sale");
            // seller approves the sale
            transaction = await escrow.connect(seller).approveSale();
            await transaction.wait();
            console.log("Seller approves sale");

            // lender funds the contract
            transaction = await lender.sendTransaction({ to: escrow.address, value: ether(80) });
            await transaction.wait();
            console.log("Funded the contract by lender");
            // lender approves the sale
            transaction = await escrow.connect(lender).approveSale();
            await transaction.wait();
            console.log("Lender approves sale");

            // Finalize the sale
            transaction = await escrow.connect(buyer).finalizeSale();
            await transaction.wait();
            console.log("Buyer finalize the sale");

            // expect seller to recive the funds
            balance = await ethers.provider.getBalance(seller.address);
            console.log("Seller balance: ", ethers.utils.formatEther(balance));
            expect(balance).to.be.above(ether(10099));

            // expects buyer to be owner after the sale
            expect(await realEstate.ownerOf(nftId)).to.equal(buyer.address);
        })
    })
})