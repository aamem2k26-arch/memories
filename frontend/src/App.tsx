import AppRouter from './routers/AppRouter';
import { ConfigProvider, App as AntApp } from 'antd';
import { AuthProvider } from './context/AuthContext';

const App = () => {
  return(
    <ConfigProvider
      theme={{
        token: {
          colorPrimary: '#ff8e53',
          fontFamily: 'Nunito, sans-serif',
          borderRadius: 24,
          colorBgContainer: 'rgba(255, 255, 255, 0.9)',
        },
      }}
    >
      <AntApp>
        <AuthProvider>
          <AppRouter />
        </AuthProvider>
      </AntApp>
    </ConfigProvider>
  )
}

export default App;