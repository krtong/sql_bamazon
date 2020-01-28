DROP DATABASE IF EXISTS bamazon;

CREATE DATABASE bamazon;

USE bamazon;

CREATE TABLE products(
	item_id INT AUTO_INCREMENT NOT NULL,
    product_name VARCHAR(100),
    department_name VARCHAR(100),
    price DECIMAL(10,2),
    stock_quantity INT(10) DEFAULT 0,
    PRIMARY KEY(item_id)
);

INSERT INTO products (product_name, department_name, price, stock_quantity)
VALUES 
("Soap", "Household", 2.5, 50),
("Paper Towels", "Household", 3, 40),
("Coffee Beans", "Food", 12.5, 80),
("Towels", "Household", 4, 20),
("Spoons", "Kitchen", 1, 50),
("Forks", "Kitchen", 2, 50),
("Bananas", "Food", 1.5, 90),
("Rug", "Household", 40, 30),
("Chair", "Household", 20.5, 10),
("Chocolate", "Food", 1, 100);


USE bamazon;

CREATE TABLE departments(
	department_id INT AUTO_INCREMENT NOT NULL,
    department_name VARCHAR(100),
    over_head_costs DECIMAL(10,2),
    PRIMARY KEY(department_id)
);

INSERT INTO departments(department_name, over_head_costs)
VALUES
("Household", 200),
("Food", 400),
("Kitchen", 300),
("Electronics", 250);



