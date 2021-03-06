require('dotenv');
const iex = require('iexcloud_api_wrapper'); // gets auth from .env automatically
const sgMail = require('@sendgrid/mail');
sgMail.setApiKey(process.env.SENDGRID_API_KEY);

const getMoverData = async() => {
  try {
    const gainers = await iex.list('gainers');
    const losers = await iex.list('losers');
    return { gainers, losers };
  }
  catch(error) {
    console.error(`Could not get data: ${error}`);
    process.exit(-1);  // nonzero exit code indicates failure
  }
}

const generateTable = (stockData) => {
  stockData = stockData.sort((a, b) => 
    Math.abs(a.changePercent) < Math.abs(b.changePercent));
  const rows = stockData.map(data => 
    `<tr>
      <td>${Math.round(data.changePercent * 10000) / 100}</td>
      <td>${data.symbol}</td>
      <td>${data.companyName}</td>
      <td>${data.latestPrice}</td>
      <td>${data.previousClose}</td>
      <td>${Math.round(data.ytdChange * 100) / 100}</td>
    </tr>`
  ).join('\n');
  return `
    <table>
      <thead>
        <tr>
          <th>% Change</th>
          <th>Symbol</th>
          <th>Company</th>
          <th>Close</th>
          <th>Previous Close</th>
          <th>YTD Change</th>
        </tr>
      </thead>
      <tbody>
        ${rows}
      </tbody>
    </table>
  `;
}

const generateHtml = (gainers, losers) => {
  const gainerTable = generateTable(gainers);
  const loserTable = generateTable(losers);
  return `<html>
    <head>
      <style>
        table, th, td {
          border: 1px solid black;
          border-collapse: collapse;
          padding: 3px;
        }
      </style> 
    </head>
    <body>
      <h1>Today's Biggest Stock Movers</h1>
      <h2>Gainers</h2>
      <div>${gainerTable}</div>
      <h2>Losers</h2>
      <div>${loserTable}</div>
    </body>
  </html>`;
}

const sendEmail = async (htmlEmailContents) => {
  const msg = {
    to: process.env.EMAIL,
    from: process.env.EMAIL,
    subject: 'Today\'s biggest stock market movers',
    html: htmlEmailContents,
  };
  try {
    await sgMail.send(msg);
  }
  catch (error) {
    console.error(`Could not send message: ${error}`);
  }
}

const main = async () => {
  const { gainers, losers } = await getMoverData();
  const htmlEmailContents = generateHtml(gainers, losers);
  await sendEmail(htmlEmailContents);
}

main()
  .then(() => console.log(`Sent stock mover email to ${process.env.EMAIL}!`))
  .catch(error => console.error(error));

