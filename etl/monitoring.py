import json
import logging
import os
from urllib.request import Request, urlopen

LOGGER = logging.getLogger('superstore.etl')


def notify_failure(period_key, run_id):
    """Optional webhook: deliberately excludes source rows, credentials and database errors."""
    LOGGER.error('ETL failed for period %s; run %s', period_key, run_id)
    endpoint = os.getenv('ALERT_WEBHOOK_URL')
    if not endpoint:
        return
    try:
        request = Request(endpoint, data=json.dumps({'event': 'etl_failed', 'period_key': period_key,
                          'run_id': run_id}).encode(), headers={'Content-Type': 'application/json'}, method='POST')
        with urlopen(request, timeout=10) as response:
            response.read(1024)
    except Exception:
        LOGGER.error('Failure notification could not be delivered')
