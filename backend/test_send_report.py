from weekly_report import get_all_users, get_user_positions, get_available_cash, get_last_friday, get_portfolio_value, get_portfolio_performance, generate_report, send_weekly_report
from datetime import timedelta

def test_send_weekly_report():
    users = get_all_users()
    if not users:
        print("No hay usuarios en Firestore.")
        return
    user = users[0]
    print(f"Enviando mail de prueba a: {user['email']}")
    date_now = get_last_friday()
    date_last_week = date_now - timedelta(days=7)
    positions = get_user_positions(user['uid'])
    cash_now = get_available_cash(user['uid'])
    value_now = get_portfolio_value(positions, cash_now, date_now)
    value_last_week = get_portfolio_value(positions, cash_now, date_last_week)
    best_assets, worst_assets = get_portfolio_performance(positions, date_now, date_last_week)
    report_html = generate_report(user, value_now, value_last_week, best_assets, worst_assets)
    send_weekly_report(user['email'], report_html)
    print("Mail enviado (si la configuración SMTP es correcta).")

if __name__ == '__main__':
    test_send_weekly_report()
