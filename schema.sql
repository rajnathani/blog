DROP database blog IF EXISTS;
CREATE database blog;

CREATE TABLE Articles (
	link varchar(142) PRIMARY KEY,
	published tinyint unsigned DEFAULT 0,
	title varchar(140) 		NOT NULL,
	content TEXT			NOT NULL,
	created TIMESTAMP		NOT NULL,
	last_updated TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE Categories(
	name varchar(40) PRIMARY KEY;

);

CREATE TABLE ArticleCategories (
	article_link varchar(142),
	category_name varchar(40),

	PRIMARY KEY (article_link, category_name),

	FOREIGN KEY article_link
	REFERENCES Articles(link)
	ON DELETE CASCADE
	ON UPDATE CASCADE,

	FOREIGN KEY category_name
	REFERENCES Categories(name)
	ON DELETE CASCADE,
	ON UPDATE CASCADE
);

CREATE TABLE Replies (
	reply_id bigint unsigned AUTO_INCREMENT PRIMARY KEY,
	status DEFAULT 0,
	email varchar(255)	        NOT NULL,
	content varchar(1000) 		NOT NULL,
	article_link varchar(142),

	FOREIGN KEY article_link
	REFERENCES Articles(link)
	ON UPDATE CASCADE
	ON DELETE CASCADE
);

CREATE TABLE ReplyVerifications (
	reply_id bigint unsigned PRIMARY KEY,
	token varchar(40) NOT NULL,
	created TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

	FOREIGN KEY reply_id
	REFERENCES Replies(reply_id)
	ON UPDATE CASCADE
	ON DELETE CASCADE

);

CREATE TABLE SearchIndexQueue (
	identifier varchar(142)		NOT NULL,
	type tinyint unsigned DEFAULT 0,
	PRIMARY_KEY(identifier, type)
);

CREATE TABLE SearchIndex (
	identifier varchar(142)		NOT NULL,
	type tinyint unsigned DEFAULT 0,
	keyword varchar(20) 		NOT NULL,
	worth smallint unsigned 	NOT NULL,

	PRIMARY_KEY(identifier,type,keyword)
);


CREATE TABLE ActivityChart (
	activity varchar(16) PRIMARY KEY,
	count tinyint unsigned NOT NULL
);
CREATE TABLE IPActivity (
	ip_address varchar(50) PRIMARY KEY,
	activity varchar(16),
	frequency smallint unsigned,

	FOREIGN KEY activity
	REFERENCES ActivityChart(activity)
	ON UPDATE CASCADE
	ON DELETE CASCADE
);

CREATE TABLE Blocked (
	ip_address varchar(50) PRIMARY KEY,
	start_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP

);

CREATE TABLE ActivityArchive (
	activity varchar(16),
	frequency bigint unsigned,

	FOREIGN KEY activity
	REFERENCES ActivityChart(activity)
	ON UPDATE CASCADE
	ON DELETE CASCADE

);
