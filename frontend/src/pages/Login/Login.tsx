import api from '../../api/axios';
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { UserOutlined, HeartOutlined } from '@ant-design/icons';
import { Form, Input, Button, Card, Typography, App } from 'antd';

const { Title, Text } = Typography;

const Login: React.FC = () => {
  const navigate = useNavigate();
  const { login } = useAuth();
  const { message } = App.useApp();
  const [loading, setLoading] = useState(false);

  const onFinish = async (values: any) => {
    try {
      setLoading(true);
      const response = await api.post('/auth/login', values);
      if (response.data.success) {
        message.success({ content: 'Welcome back, friend!', icon: <HeartOutlined style={{color: '#fe6b8b'}} /> });
        login(response.data.token);
        navigate('/home');
      }
    } catch (error: any) {
      message.error(error.response?.data?.message || 'Oops, login failed!');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh', background: 'transparent' }}>
      <div className="animate-float" style={{ width: '100%', padding: '0 20px', display: 'flex', justifyContent: 'center' }}>
        <Card className="glass-card" style={{ width: 400, borderRadius: '24px', padding: '10px' }} variant="borderless">
          <div style={{ textAlign: 'center', marginBottom: '32px' }}>
            <Title level={2} style={{ marginTop: 0, color: '#ff8e53', fontWeight: 800 }}>Welcome, Friend!</Title>
            <Text type="secondary" style={{ fontSize: '16px' }}>Jump back into our memories!</Text>
          </div>
          <Form
            name="login_form"
            initialValues={{ remember: true }}
            onFinish={onFinish}
            layout="vertical"
            size="large"
          >
            <Form.Item
              name="email"
              rules={[
                { required: true, message: 'Please drop your email here!' },
                { type: 'email', message: 'Hmm, that doesn\'t look like a valid email!' }
              ]}
            >
              <Input prefix={<UserOutlined style={{ color: '#ff8e53' }} />} placeholder="Email Address" style={{ padding: '12px 20px', fontSize: '16px' }} />
            </Form.Item>
            <Form.Item
              name="password"
              rules={[{ required: true, message: 'Don\'t forget your password!' }]}
            >
              <Input.Password
                prefix={<HeartOutlined style={{ color: '#fe6b8b' }} />}
                placeholder="Secret Password"
                style={{ padding: '12px 20px', fontSize: '16px' }}
              />
            </Form.Item>

            <Form.Item style={{ marginTop: '30px', marginBottom: 0 }}>
              <Button htmlType="submit" className="friendship-btn" style={{ width: '100%', height: '50px', fontSize: '18px', borderRadius: '50px' }} loading={loading}>
                Let's Go!
              </Button>
            </Form.Item>
          </Form>
        </Card>
      </div>
    </div>
  );
};

export default Login;