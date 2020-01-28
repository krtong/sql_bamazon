const inquirer = require("inquirer");
const mysql = require("mysql");

var connection = mysql.createConnection({
    host: "localhost",
    port: 3306,
    user: "root",
    password: "root",
    database: "bamazon"
});

connection.connect();

//customer Bamazon...
const init = async () => {
    // table configs:
    let align = ['right', 'center', 'right']; //'left', 'right', 'center'
    let negativeSpace = [' ', ' ', '.']; //'_', '-', ' ', ...
    const priceDisplay = price => '$' + price.toFixed(2).toString();
    const productNameDisplay = name => name[name.length-1] === 's' ? name.slice(0, name.length-1) :  name;
    const productIDDisplay = id => id.toString() + '.)';


    const querySQL = {
        all: `SELECT * FROM products`,
        id:  `SELECT * FROM products WHERE item_id = ?`,
        update: `UPDATE products SET ? WHERE ?`
    };

    const promptList = {
        'continue shopping': {
            name: "anotherPurchase",
            type: "list",
            choices: ['Yes', 'No'],
            message: "Would you like to continue shopping?",
        },
        'item select': choices  => {
            return {
                choices,
                name: "selectedItem",
                type: 'rawlist',
                message: "What Product ID would you like to buy?",
            };
        },
        'order qty': (qty, name) => {
            return {
                name: "purchase",
                type: "input",
                message: `How many ${name} would you like to buy?`,
                validate: input => !isNaN(input) && qty >= input ? true : `The number you entered is invalid. Please pick a number less than or equal to ${qty}.`
            };
        }
    };

    // trying to turn connection.query into async/await.
    const sqlQuery = async (...args) => await new Promise((resolve, reject) => 
        args.length === 2 ? 
        connection.query(args[0], (err, res) => err ? reject(err) : resolve(args[1](res))) : //im sure there's an easier way to handle args.
        connection.query(args[0], args[1], (err, res) => err ? reject(err) : resolve(args[2](res)))
    );

    //generate table
    const table = await sqlQuery(querySQL.all, response => {
        let table = [['Product ID', 'Product Name', 'Product Price']];
        let colLengthArr = [10, 12, 13];
        response.forEach(item => {
            let {item_id,product_name,price} = item;
            let row = [productIDDisplay(item_id), productNameDisplay(product_name), priceDisplay(price)];
            row.forEach((col, idx) => colLengthArr[idx] < col.length ? col.length : colLengthArr[idx]);
            table.push(row);
        });
        table.forEach((row, i) => {
            colLengthArr.forEach((longest, j) => {
                let cell = table[i][j];
                if (cell.length !== longest) {
                    const space = Array(longest - cell.length).fill(negativeSpace[j]).join('');
                    const leftHalf = space.slice(Math.ceil(space.length / 2));
                    const rightHalf = space.slice(Math.floor(space.length / 2));
                    table[i][j] = align[j] === 'left' ? cell + space :
                    align[j] === 'right' ? space + cell :
                    leftHalf + cell + rightHalf;
                };
            });
            table[i] = row.join(' | ');
        });
        [1, 0, table.length+2].forEach(x => table.splice(x, 0, colLengthArr.map((a, i) => Array(a + (i === 1 ? 2 : 1)).fill('-').join('')).join('+')));
        return `| ${table.join(' |\n| ')} |`;
    });

    //
    const continueShopping = async () => {
        const {anotherPurchase} = await inquirer.prompt(promptList['continue shopping']);
        if (anotherPurchase === 'No') {console.log("Thanks for shopping, bye!");
            connection.end()
        } else init();
    };

    //init init
    //display table:
    console.log(table);

    //create list of items:
    const list = await sqlQuery(querySQL.all, items => items.map(item => item.product_name));

    //choose item:
    const {selectedItem} = await inquirer.prompt(promptList['item select'](list));
    const item_id = await list.indexOf(selectedItem) + 1;

    //get available quantity:
    let [{stock_quantity: qty, product_name: name}] = await sqlQuery(querySQL.id, [item_id], res => res);
    name += qty > 1 && name[name.length - 1] !== 's' ? 's' : '';
    console.log(`there are ${qty} ${name} left.`);

    //confirm purchase quantity
    const {purchase} = await inquirer.prompt(promptList['order qty'](qty, name));

    //update DB
    const updates = [{stock_quantity: qty - purchase}, {item_id}];
    console.log(`there are now ${qty-purchase} ${name} left in stock.`)
    await sqlQuery(querySQL.update, updates, () => {console.log("Thank you for your purchase!")});

    //another round?
    continueShopping();
}

init()