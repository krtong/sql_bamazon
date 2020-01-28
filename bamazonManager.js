const inquirer = require("inquirer");
const mysql = require("mysql");

var connection = mysql.createConnection({
    host: "localhost",
    port: 3306,
    user: "root",
    password: "root",
    database: "bamazon"
});

connection.connect()

const init = async () => {

    const querySQL = {
        all: `SELECT * FROM products`,
        departments: `SELECT department_name FROM departments`,
        id: `SELECT * FROM products WHERE item_id = ?`,
        update: `UPDATE products SET ? WHERE ?`,
        lowQty: `SELECT * FROM products WHERE stock_quantity < 30`,
        name: `SELECT * FROM products WHERE product_name = ?`,
        insert: `INSERT INTO products SET ?`,
        joinAll: `SELECT * FROM products  JOIN departments ON products.department_name = departments.department_name `
    };

    const promptList = {
        'select': {
            managerCommands: choices => {
                return {
                    choices,
                    name: "command",
                    type: "list",
                    message: "Welcome to the Manager's portal.  What would you like to do?",
                }
            },
            productName: (choices) => {
                return {
                    choices,
                    name: "product_name",
                    type: "list",
                    message: "Which product would you like to add to inventory?",
                }
            },
            department: (product_name, choices ) => {
                return {
                    choices,
                    message: `${product_name} belongs in what department?`,
                    name: "department_name",
                    type: "list",
                }
            }
        },
        'new': {
            productName: {
                name: "product_name",
                type: "input",
                message: "What is the name of product you would like to add? (max char: 100)",
                validate: input => input.length <= 100
            },
            inventory: (name, addOrSub, qty = 1000) => {
                return {
                    name: "qty",
                    type: "number",
                    message: `How many ${name} would you like to ${addOrSub}?`,
                    validate: input => !isNaN(input) ? true : false
                }
            },
            price: name => {
                return {
                    name: "price",
                    type: "number",
                    message: "What is the price of the product?",
                    validate: input => isNaN(input) || input <= 0 ? `Please select a real number` : true
                }
            },
            stock: name => {
                return {
                    name: "stock_quantity",
                    type: "number",
                    message: `How many ${name} will we stock?`,
                    validate: input => isNaN(input) || input <= 0 ? `Please select a real number` : true
                }
            }
        }
    }

    const sqlQuery = async (...arg) => await new Promise((resolve, reject) =>
        arg.length < 3 ?
        connection.query(arg[0], (err, res) => err ? reject(err) : resolve(arg[1](res))) : //im sure there's an easier way to handle args.
        connection.query(arg[0], arg[1], (err, res) => err ? reject(err) : resolve(arg[2](res)))
    );

    const _table = async (...args) => {

        const cb = response => {
            //table configs
            let headers = Object.keys(response[0]);
            let cols = headers.length
            let colLengthArr = headers.map(col => col.length);
            let table = [Object.keys(response[0]).map(a => a.split('_').map(a => a[0].toUpperCase() + a.slice(1).toLowerCase()).join(' '))];
            class Decorater {
                constructor({
                    func = (a) => a.toString(),
                    align = 'center', //'left', 'right', 'center'
                    negSpace = ' ' // ' ', '.', '_', etc...
                } = {}) {
                    Object.assign(this, {func,align,negSpace})
                }
            };

            //customize the format of the columns by column name.
            let decorate = {
                department_name: new Decorater(),
                product_name: new Decorater(),
                item_id: new Decorater({
                    func: id => `${id}.)`,
                    align: 'right'
                }),
                price: new Decorater({
                    func: price => '$' + price.toFixed(2).toString(),
                    align: 'right'
                }),
                stock_quantity: new Decorater({
                    align: 'left',
                    negSpace: '_'
                }),
                over_head_costs: new Decorater({
                    func: cost => '$' + cost.toFixed(2).toString(),
                    negSpace: '.'
                }),
                department_id: new Decorater({
                    func: id => `[${id}]`,
                    negSpace: '.'
                }),
            };

            response.forEach((row, idx) => {
                let arr = Object.values(row).map((cell, i) => decorate[headers[i]].func(cell));
                arr.forEach((cell, idx) => colLengthArr[idx] = colLengthArr[idx] < cell.length ? cell.length : colLengthArr[idx]);
                table.push(arr);
            });

            table.forEach((row, i) => {
                colLengthArr.forEach((longest, j) => {
                    let cell = table[i][j];
                    if (cell.length !== longest) {
                        let difference = longest - cell.length;
                        let key = headers[j]
                        let obj = decorate;
                        let {align,negSpace} = decorate[headers[j]];
                        const space = Array(difference).fill(negSpace).join('');
                        const leftHalf = space.slice(Math.ceil(space.length / 2));
                        const rightHalf = space.slice(Math.floor(space.length / 2));
                        table[i][j] = align === 'left' ? cell + space :
                            align === 'right' ? space + cell :
                            leftHalf + cell + rightHalf;
                    };
                });
                table[i] = row.join(' | ');
            });

            [1, 0, table.length + 2].forEach(x => table.splice(x, 0, colLengthArr.map((a, i, arr) => Array(a + (i === 0 || i === arr.length - 1 ? 1 : 2)).fill('-').join('')).join('+')));
            return `| ${table.join(' |\n| ')} |`;
        }
        return args.length === 0 ? await sqlQuery(querySQL.all, cb) :
            args.length === 1 ? await sqlQuery(args[0], cb) :
            await sqlQuery(args[0], args[1], cb);
    };

    //Handles directing user input to correct function, and returns answer
    const managerCommands = async () => {
        const list = await sqlQuery(querySQL.all, items => items.map(item => item.product_name));

        const commands = {
            "View Products for Sale": async () => {
                let table = await _table();
                console.log(table);

                //loop
                managerCommands()
            },
            "View Low Inventory": async () => {
                let table = await _table(querySQL.lowQty)
                console.log(table);

                //loop
                managerCommands()
            },
            "Add to Inventory": async () => {
                //choose product
                let {product_name} = await inquirer.prompt(promptList.select.productName(list));
                let item_id = list.indexOf(product_name) + 1
                console.log('product_name', product_name, "item_id", item_id)

                //get current quantity
                console.log(await _table(querySQL.id, item_id))
                let {stock_quantity} = await sqlQuery(querySQL.id, item_id, res => res[0]);
                console.log(`There are currently ${stock_quantity} ${product_name}.`)

                //get qty of added inventory
                let {qty} = await inquirer.prompt(promptList.new.inventory(product_name, 'add'))

                //update
                let update = [{stock_quantity: stock_quantity + qty}, {product_name}];
                await sqlQuery(querySQL.update, update, res => res);
                console.log(await _table(querySQL.id, item_id));

                //loop
                managerCommands()
            },
            "Add New Product": async () => {
                //get product info
                let department_list = await sqlQuery(querySQL.departments, res => res.map(a => a.department_name))
                let {product_name} = await inquirer.prompt(promptList.new.productName);
                let {department_name} = await inquirer.prompt(promptList.select.department(product_name, department_list));
                let {price} = await inquirer.prompt(promptList.new.price(product_name));
                price = price.toFixed(2);
                let {stock_quantity} = await inquirer.prompt(promptList.new.stock(product_name));

                //insert into db
                await sqlQuery(querySQL.insert, {product_name, department_name, price, stock_quantity}, a => a);
                const list = await sqlQuery(querySQL.all, items => items.map(item => item.product_name));
                let item_id = list.indexOf(product_name) + 1;

                //on success
                console.log(await _table(querySQL.id, item_id));
                console.log(`${product_name} has been added!`);

                //loop
                managerCommands()
            },
            "Exit": () => {
                console.log("Goodbye!");
                connection.end()
            }
        }

        const {command} = await inquirer.prompt(promptList.select.managerCommands(Object.keys(commands)));
        commands[command]();
    }
    managerCommands();
};

init()