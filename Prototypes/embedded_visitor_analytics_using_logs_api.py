import pandas
import requests
import json
import streamlit as st
from datetime import datetime

business_id = {YEXT_BUSINESS_ID}

api_version = 20220630

reports_api_key = {API_KEY}
logs_api_key = {API_KEY}

## Retrieving Data

visitors_query = """{
  "metrics": [
    "ANSWERS_SEARCHES"
  ],
  "dimensions": [
    "VISITOR_ID",
    "VISITOR_NAME"
  ]
}"""

recent_result_clicks_query = """{
  "fields": ["entityName","entityExternalId","answers.queryId"],
  "pageSize": 3,
  "descending": true,
  "filter": "action in ['TITLE_CLICK','CTA_CLICK','TAP_TO_CALL','ORDER_NOW','ADD_TO_CART','APPLY_NOW','DRIVING_DIRECTIONS','THUMBS_UP','ROW_EXPAND','VIEW_WEBSITE','EMAIL','BOOK_APPOINTMENT','RSVP','THUMBS_DOWN'] && visitor.id == '%s'"
}"""

recent_searches_query = """{
  "fields": ["searchTerm","answers.queryId"],
  "pageSize": 3,
  "descending": true,
  "filter": "action in ['SEARCH'] && visitor.id == '%s'"
}"""

recent_events_query = """{
  "fields": ["searchTerm","answers.queryId","entityName","entityExternalId","action","eventTimestamp"],
  "pageSize": 3,
  "descending": true,
  "filter": "visitor.id == '%s'"
}"""

@st.cache
def get_log_data(request_body,business_id,api_key,api_version):
    try:
        query_endpoint = 'https://api.yext.com/v2/accounts/%s/logs/tables/analyticsEvents/query?api_key=%s&v=%s' % (business_id,api_key,api_version)
        headers = {'Content-type': 'application/json'}
        output = requests.post(url=query_endpoint,headers=headers,json=json.loads(request_body))
        output = output.json()['response']['logRecords']
        
        return output
    except:    
        output = 'No Data'
        return output
    
def get_agg_data(request_body,business_id,api_key,api_version):
    try:
        query_endpoint = 'https://api.yext.com/v2/accounts/%s/analytics/reports?api_key=%s&v=%s' % (business_id,api_key,api_version)
        headers = {'Content-type': 'application/json'}
        output = requests.post(url=query_endpoint,headers=headers,json=json.loads(request_body))
        output = output.json()['response']['data']
        
        return output
    except:    
        output = 'No Data'
        return output

st.markdown("### Yext AI Search",unsafe_allow_html=False)

st.text_input(label="",placeholder="Search") 

search_results, visitor_history = st.columns(2)

visitors = get_agg_data(visitors_query,business_id,reports_api_key,api_version)
visitors = pandas.DataFrame(visitors)
visitors['display_value'] = [str(v_name) + " (" + str(v_id) + ")" for v_name,v_id in visitors[['visitor_name','visitor_id']].values.tolist()]
select_visitor_values = visitors['display_value'].values.tolist()

with search_results:
    search_results = st.markdown("#### [Search Results]()")
    
with visitor_history:
    visitor_history = st.markdown("#### Visitor History")
select_visitor = st.selectbox("", select_visitor_values)
    
visitor_id = visitors.query("display_value == '%s'" % select_visitor)['visitor_id'].values.tolist()[0]

recently_clicked_results = get_log_data(recent_result_clicks_query % visitor_id,business_id,logs_api_key,api_version)
recent_searches = get_log_data(recent_searches_query % visitor_id,business_id,logs_api_key,api_version)
recent_events = get_log_data(recent_events_query % visitor_id,business_id,logs_api_key,api_version)

st.markdown("""---""")
st.markdown("##### Recently Clicked Results",unsafe_allow_html=False) 

sample_text = """- [%s]()
- [%s]()
- [%s]()"""

recently_clicked_results_text = sample_text % (recently_clicked_results[0]['entityName'],recently_clicked_results[1]['entityName'],recently_clicked_results[2]['entityName'])
st.markdown(recently_clicked_results_text,unsafe_allow_html=False)

st.markdown("##### Recent Searches",unsafe_allow_html=False)

recent_searches_text = sample_text % (recent_searches[0]['searchTerm'],recent_searches[1]['searchTerm'],recent_searches[2]['searchTerm'])
st.markdown(recent_searches_text,unsafe_allow_html=False)

st.markdown("""---""")
st.markdown("##### Visitor Activity",unsafe_allow_html=False) 

sample_visitor_activity_text = """%s %s  
[%s](%s)  
%s  

"""

# event_timestamp = datetime.strptime(event_timestamp,'%Y-%m-%dT%H:%M:%S.%fZ').strftime('%m/%d/%Y, %H:%M')

recent_events_text = ""

for event in recent_events:
    action = event['action']
    query = event['searchTerm']
    query_id = event['answers']['queryId']
    entity_name = event['entityName']
    entity_id = event['entityExternalId']
    event_timestamp = datetime.strptime(event['eventTimestamp'],'%Y-%m-%dT%H:%M:%S.%fZ').strftime('%m/%d/%Y, %H:%M')
    thumbs_up_icon = ':thumbsup:'
    search_icon = ':mag_right:'
    search = 'https://www.yext.com/s/1819103/answers/experiences/fins_demo_v2/searchQueryLogDetails/%s' % query_id
    entity = 'https://www.yext.com/s/1819103/entity/edit3?externalEntityIds=%s' % entity_id
    
    if action == 'SEARCH':
        event_text = sample_visitor_activity_text % (search_icon,'Searched',query,search,event_timestamp)
    else:
        event_text = sample_visitor_activity_text % (thumbs_up_icon,'Clicked Entity',entity_name,entity,event_timestamp)
    
    recent_events_text += event_text

st.markdown(recent_events_text,unsafe_allow_html=False)

