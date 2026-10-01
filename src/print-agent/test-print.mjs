async function testPrint() {
  const sampleTspl = `
SIZE 60 mm, 25 mm
GAP 3 mm, 0
SPEED 4
DENSITY 10
DIRECTION 0
CLS
TEXT 16,16,"2",0,1,1,"SURYA GOLD & DIAMONDS"
TEXT 16,48,"2",0,1,1,"TEST TAG: SGD26RG00001"
BARCODE 16,80,"128",80,0,0,2,4,"SGD26RG00001"
TEXT 250,16,"2",0,1,1,"22K916"
TEXT 250,48,"1",0,1,1,"GW: 4.520g"
TEXT 250,72,"1",0,1,1,"NW: 4.200g"
PRINT 1,1
`.trim();

  const response = await fetch("http://127.0.0.1:9191/print/tspl", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: "Bearer surya-print-secret-token",
    },
    body: JSON.stringify({
      printerName: "SNBC TVSE LP46 Dlite BPLE",
      tsplData: sampleTspl,
      copies: 1,
    }),
  });

  const resJson = await response.json();
  console.log("Print Response:", resJson);
}

testPrint();
