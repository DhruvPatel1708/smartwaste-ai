from app import app


def test_summary_endpoint():
    with app.test_client() as client:
        response = client.get('/api/summary')
        assert response.status_code == 200
        data = response.get_json()
        assert 'total_reports' in data
        assert data['total_reports'] >= 4


def test_reports_post_and_get():
    with app.test_client() as client:
        payload = {
            'title': 'New waste issue',
            'category': 'general_waste',
            'location': 'Tech Park',
            'severity': 'medium',
            'reporter': 'Test User',
            'latitude': 12.9,
            'longitude': 77.5,
            'description': 'Test issue'
        }
        post = client.post('/api/reports', json=payload)
        assert post.status_code == 201
        created = post.get_json()
        assert created['title'] == 'New waste issue'

        get_resp = client.get('/api/reports')
        assert get_resp.status_code == 200
        records = get_resp.get_json()
        assert any(item['id'] == created['id'] for item in records)


def test_hotspots_and_routes():
    with app.test_client() as client:
        hotspot_resp = client.get('/api/hotspots')
        route_resp = client.get('/api/routes')
        assert hotspot_resp.status_code == 200
        assert route_resp.status_code == 200
        hotspot_data = hotspot_resp.get_json()
        route_data = route_resp.get_json()
        assert isinstance(hotspot_data, list)
        assert isinstance(route_data, list)
        assert hotspot_data[0]['zone']
        assert route_data[0]['vehicle_id']


def test_admin_login_and_prediction_access():
    with app.test_client() as client:
        unauth = client.get('/api/route-history')
        assert unauth.status_code == 401

        login = client.post('/api/admin/login', json={'username': 'admin', 'password': 'admin123'})
        assert login.status_code == 200
        token = login.get_json()['token']

        history = client.get('/api/route-history', headers={'Authorization': f'Bearer {token}'})
        assert history.status_code == 200
        prediction = client.get('/api/predictions', headers={'Authorization': f'Bearer {token}'})
        assert prediction.status_code == 200
        assert isinstance(prediction.get_json(), list)
