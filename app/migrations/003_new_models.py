
# 003_new_models.py

def migrate(migrator, database, fake=False, **kwargs):

    migrator.sql("""CREATE TABLE city(
        id serial PRIMARY KEY NOT NULL,
        name VARCHAR(150) NOT NULL,
        code VARCHAR(20) NOT NULL
    )""")

    migrator.sql("""CREATE TABLE route(
        id serial PRIMARY KEY NOT NULL,
        name VARCHAR(150) NOT NULL,
        code VARCHAR(20) NOT NULL,
        last_data_time timestamp,
        city_id serial NOT NULL REFERENCES city(id),
        CONSTRAINT unique_city_route UNIQUE (city_id, code)
    )""")

    migrator.sql("""CREATE TABLE sensor(
        id serial PRIMARY KEY NOT NULL,
        name VARCHAR(150) NOT NULL,
        code VARCHAR(20) NOT NULL,
        latitude DOUBLE PRECISION,
        longitude DOUBLE PRECISION,
        route_id serial NOT NULL REFERENCES route(id),
        CONSTRAINT unique_route_sensor UNIQUE (route_id, code)
    )""")

def rollback(migrator, database, fake=False, **kwargs):

    migrator.sql("""DROP TABLE city""")
    migrator.sql("""DROP TABLE route""")
    migrator.sql("""DROP TABLE sensor""")
