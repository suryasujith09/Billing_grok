import { PrismaClient } from "@prisma/client";
import { calcInvoice, calcLine, calcOldGold } from "../src/lib/invoice-calc";
import { financialYear, padInvoice } from "../src/lib/money";

const prisma = new PrismaClient();

async function main() {
  await prisma.payment.deleteMany();
  await prisma.oldGoldItem.deleteMany();
  await prisma.invoiceItem.deleteMany();
  await prisma.invoice.deleteMany();
  await prisma.ornament.deleteMany();
  await prisma.customer.deleteMany();
  await prisma.metalRate.deleteMany();
  await prisma.shop.deleteMany();

  await prisma.shop.create({
    data: {
      id: "default",
      name: "Surya Gold and Diamonds",
      legalName: "Surya Gold and Diamonds",
      address: "12, Jewellery Bazaar",
      city: "Hyderabad",
      state: "Telangana",
      stateCode: "36",
      pincode: "500001",
      phone: "040-4000-1200",
      email: "accounts@suryagold.example",
      gstin: "36AABCS1234A1Z5",
      pan: "AABCS1234A",
      bankName: "HDFC Bank",
      bankAccount: "50200011223344",
      ifsc: "HDFC0001234",
      invoicePrefix: "SGD",
      nextInvoiceNo: 2,
      makingGstMode: "SEPARATE_5",
      terms:
        "Goods once sold will not be taken back except as per exchange policy. Subject to Hyderabad jurisdiction. Hallmarked jewellery carries BIS HUID as printed.",
    },
  });

  const rates = [
    { metal: "GOLD", purity: "24K", ratePerGram: 11000 },
    { metal: "GOLD", purity: "22K", ratePerGram: 10083 },
    { metal: "GOLD", purity: "18K", ratePerGram: 8250 },
    { metal: "GOLD", purity: "14K", ratePerGram: 6417 },
    { metal: "SILVER", purity: "999", ratePerGram: 140 },
    { metal: "SILVER", purity: "925", ratePerGram: 129 },
    { metal: "PLATINUM", purity: "950", ratePerGram: 4200 },
  ];

  await prisma.metalRate.createMany({ data: rates });

  const [anjali, ramesh, walkin] = await Promise.all([
    prisma.customer.create({
      data: {
        name: "Anjali Reddy",
        phone: "9876543210",
        address: "Banjara Hills",
        city: "Hyderabad",
        state: "Telangana",
        pincode: "500034",
        pan: "BJTPR1234K",
      },
    }),
    prisma.customer.create({
      data: {
        name: "Ramesh Kumar",
        phone: "9123456780",
        address: "Ameerpet",
        city: "Hyderabad",
        state: "Telangana",
        pincode: "500016",
      },
    }),
    prisma.customer.create({
      data: {
        name: "Walk-in Customer",
        phone: "9000000000",
        notes: "Use for counter sales when the buyer is not on file.",
      },
    }),
  ]);

  const ornaments = await Promise.all([
    prisma.ornament.create({
      data: {
        tagNo: "SGD-22001",
        name: "Temple Necklace",
        category: "NECKLACE",
        metal: "GOLD",
        purity: "22K",
        huid: "A1B2C3D4E5",
        grossWeight: 18.24,
        stoneWeight: 0.4,
        netWeight: 17.84,
        makingType: "PER_GRAM",
        makingValue: 750,
        wastagePercent: 6,
        hallmarkCharge: 45,
        status: "SOLD",
      },
    }),
    prisma.ornament.create({
      data: {
        tagNo: "SGD-22002",
        name: "Kada Bangles (Pair)",
        category: "BANGLE",
        metal: "GOLD",
        purity: "22K",
        huid: "F6G7H8J9K0",
        grossWeight: 24.56,
        netWeight: 24.56,
        makingType: "PER_GRAM",
        makingValue: 680,
        wastagePercent: 8,
        hallmarkCharge: 90,
      },
    }),
    prisma.ornament.create({
      data: {
        tagNo: "SGD-18001",
        name: "Solitaire Ring",
        category: "RING",
        metal: "GOLD",
        purity: "18K",
        huid: "L1M2N3P4Q5",
        grossWeight: 3.21,
        stoneWeight: 0.18,
        netWeight: 3.03,
        makingType: "FLAT",
        makingValue: 4500,
        stoneCharge: 28500,
        hallmarkCharge: 45,
      },
    }),
    prisma.ornament.create({
      data: {
        tagNo: "SGD-22003",
        name: "Rope Chain 20 inch",
        category: "CHAIN",
        metal: "GOLD",
        purity: "22K",
        huid: "R6S7T8U9V0",
        grossWeight: 8.75,
        netWeight: 8.75,
        makingType: "PERCENT",
        makingValue: 12,
        wastagePercent: 4,
        hallmarkCharge: 45,
      },
    }),
    prisma.ornament.create({
      data: {
        tagNo: "SGD-22004",
        name: "Jhumka Earrings",
        category: "EARRING",
        metal: "GOLD",
        purity: "22K",
        huid: "W1X2Y3Z4A5",
        grossWeight: 6.12,
        stoneWeight: 0.22,
        netWeight: 5.9,
        makingType: "PER_GRAM",
        makingValue: 820,
        wastagePercent: 7,
        hallmarkCharge: 45,
      },
    }),
    prisma.ornament.create({
      data: {
        tagNo: "SGD-22005",
        name: "Black Bead Mangalsutra",
        category: "MANGALSUTRA",
        metal: "GOLD",
        purity: "22K",
        huid: "B6C7D8E9F0",
        grossWeight: 12.4,
        stoneWeight: 0.6,
        netWeight: 11.8,
        makingType: "PER_GRAM",
        makingValue: 700,
        wastagePercent: 5,
        hallmarkCharge: 45,
      },
    }),
    prisma.ornament.create({
      data: {
        tagNo: "SGD-22006",
        name: "Lakshmi Coin 10g",
        category: "COIN",
        metal: "GOLD",
        purity: "24K",
        grossWeight: 10,
        netWeight: 10,
        makingType: "FLAT",
        makingValue: 250,
        wastagePercent: 0,
      },
    }),
  ]);

  const sold = ornaments[0];
  const rate = 10083;
  const line = calcLine(
    {
      netWeight: Number(sold.netWeight),
      ratePerGram: rate,
      makingType: "PER_GRAM",
      makingValue: 750,
      wastagePercent: 6,
      stoneCharge: 0,
      hallmarkCharge: 45,
      otherCharge: 0,
    },
    "SEPARATE_5",
  );
  const oldGold = calcOldGold(8.2, 9800, 2);
  const totals = calcInvoice(
    [{ ...line, stoneCharge: 0, hallmarkCharge: 45, otherCharge: 0 }],
    oldGold,
    0,
  );
  const paid = totals.netPayable;
  const finalTotals = calcInvoice(
    [{ ...line, stoneCharge: 0, hallmarkCharge: 45, otherCharge: 0 }],
    oldGold,
    paid,
  );

  const { gstTotal: _g, beforeRound: _b, ...dbTotals } = finalTotals;
  const invoiceNo = `SGD/${financialYear()}/${padInvoice(1)}`;

  await prisma.invoice.create({
    data: {
      invoiceNo,
      date: new Date(),
      customer: { connect: { id: anjali.id } },
      customerName: anjali.name,
      customerPhone: anjali.phone,
      customerAddr: "Banjara Hills, Hyderabad",
      customerPan: anjali.pan,
      placeOfSupply: "Telangana",
      notes: "Sample opening bill so the counter and reports have data.",
      ...dbTotals,
      items: {
        create: {
          ornament: { connect: { id: sold.id } },
          tagNo: sold.tagNo,
          description: sold.name,
          hsn: "7113",
          huid: sold.huid,
          metal: sold.metal,
          purity: sold.purity,
          category: sold.category,
          grossWeight: sold.grossWeight,
          stoneWeight: sold.stoneWeight,
          netWeight: sold.netWeight,
          ratePerGram: rate,
          goldValue: line.goldValue,
          makingType: "PER_GRAM",
          makingValue: 750,
          makingAmount: line.makingAmount,
          wastagePercent: 6,
          wastageAmount: line.wastageAmount,
          stoneCharge: 0,
          hallmarkCharge: 45,
          otherCharge: 0,
          taxable3: line.taxable3,
          taxable5: line.taxable5,
          lineTotal: line.lineTotal,
        },
      },
      exchanges: {
        create: {
          description: "Old 22K chain",
          metal: "GOLD",
          purity: "22K",
          grossWeight: 8.2,
          netWeight: 8.2,
          ratePerGram: 9800,
          deductionPercent: 2,
          amount: oldGold,
        },
      },
      payments: {
        create: [
          { method: "UPI", amount: Math.min(paid, 50000), reference: "UPI/DEMO/001" },
          {
            method: "CASH",
            amount: Math.max(0, paid - 50000),
            reference: "",
          },
        ].filter((p) => p.amount > 0),
      },
    },
  });

  void walkin;
  void ramesh;

  console.log("Seeded Surya Gold and Diamonds with sample stock, rates, and one invoice.");
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (error) => {
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  });
