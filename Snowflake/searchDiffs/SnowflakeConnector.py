import os
import pandas as pd
from snowflake import connector
from snowflake.connector.pandas_tools import write_pandas


class SnowflakeConnector:
    def __init__(self):

        # Get account and user from env variables.
        self.account = os.getenv("SNOWFLAKE_ACCOUNT")
        self.user = os.getenv("SNOWFLAKE_USER")

        # Raise error if not found.
        if not self.account or not self.user:
            raise OSError("SNOWFLAKE_ACCOUNT or SNOWFLAKE_USER not found in environment variables.")

        # Connect to Snowflake
        self.conn = connector.connect(
            authenticator="externalbrowser",
            account=self.account,
            user=self.user,
            warehouse="HUMAN_WH",
        )
        self.cursor = self.conn.cursor
