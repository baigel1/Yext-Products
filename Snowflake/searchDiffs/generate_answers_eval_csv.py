import logging
from rich.logging import RichHandler

FORMAT = "%(message)s"
logging.basicConfig(level="INFO", format=FORMAT, datefmt="[%X]", handlers=[RichHandler()])
LOGGER = logging.getLogger(__name__)

import argparse
import datetime as dt
import pandas as pd
from SnowflakeConnector import SnowflakeConnector


def default_date_range():
    """Get the default date range, which is the past week."""
    now = dt.datetime.now()
    last_week = now - dt.timedelta(days=7)
    pattern = "%Y-%m-%d"
    now_str = now.strftime(pattern)
    last_week_str = last_week.strftime(pattern)
    return last_week_str, now_str


def main(args):

    connection = SnowflakeConnector()

    # Set date range; default to last week if not provided in args
    start_date, end_date = default_date_range()
    if not args.start_date:
        args.start_date = start_date
    if not args.end_date:
        args.end_date = end_date

    query = f"""
    SELECT
        searches.raw_query,
        searches.business_id as businessId,
        searches.experience_key as experienceKey
    FROM
        prod_data_hub.answers.searches
    LEFT JOIN
        prod_data_hub.answers.user_data
    ON
        user_data.search_id = searches.id
    WHERE
        user_data.traffic_source = 'EXTERNAL'
        AND searches.raw_query != ''
        AND searches.raw_query is not null
        AND searches.version_label = 'PRODUCTION'
        AND searches.timestamp BETWEEN '{args.start_date}' AND '{args.end_date}'
    """

    # Add optional WHERE clauses
    if args.business_id:
        query += f"AND searches.business_id = {args.business_id}\n"
    if args.experience_key:
        query += f"AND searches.experience_key = '{args.experience_key}'\n"
    if args.excluded_business_ids:
        query += (
            "AND searches.business_id NOT IN"
            f" {str(args.excluded_business_ids).replace('[', '(').replace(']', ')')}\n"
        )
    if args.ignore_numerical:
        query += "AND NOT regexp_like(searches.raw_query, '\\d{3,}')\n"
    if args.locales:
        query += f"AND searches.locale IN {str(args.locales).replace('[', '(').replace(']', ')')}\n"

    LOGGER.info(query)
    connection.cursor().execute("use role product")
    # Execute query
    df = pd.read_sql(query, connection)
    df = df.drop_duplicates()
    df.columns = ["query", "businessId", "experienceKey"]

    # Create Evaluation tool columns
    df["A Version"] = args.a_version
    df["B Version"] = args.b_version
    df["AfeaturesOff"] = args.a_features_off
    df["BfeaturesOn"] = args.b_features_on

    # Randomly sample / shuffle, and save to CSV
    if args.rows > len(df.index):
        LOGGER.warning(
            f"Fetched fewer queries than requested number of rows. Returning {len(df.index)} rows"
            " instead."
        )
        args.rows = len(df.index)

    df = df.sample(n=args.rows)
    df.to_csv(args.outfile, index=False)


if __name__ == "__main__":
    parser = argparse.ArgumentParser()

    # Arguments for sampling Answers queries
    parser.add_argument("--rows", default=1000)
    parser.add_argument("--outfile", default="sample.csv")
    parser.add_argument("--business_id", default=None)
    parser.add_argument("--experience_key", default=None)
    parser.add_argument("--excluded_business_ids", nargs="+", default=[762154])
    parser.add_argument("--start_date", default=None)
    parser.add_argument("--end_date", default=None)
    parser.add_argument("--locales", default=["en", "en_gb", "en_GB"])
    parser.add_argument("--ignore_numerical", default=False)

    # Arguments for Evaluation tool
    parser.add_argument("--a_version", default="PRODUCTION")
    parser.add_argument("--b_version", default="PRODUCTION")
    parser.add_argument("-a", "--a_features_off", default="")
    parser.add_argument("-b", "--b_features_on", required=True)

    args = parser.parse_args()
    main(args)
