CREATE EXTENSION IF NOT EXISTS "pgcrypto";

CREATE TABLE IF NOT EXISTS users (
  id            VARCHAR(20)  PRIMARY KEY,
  name          VARCHAR(100) NOT NULL,
  email         VARCHAR(100) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  role          VARCHAR(20)  NOT NULL CHECK (role IN ('Employee', 'Manager')),
  manager_id    VARCHAR(20)  REFERENCES users(id) ON DELETE SET NULL,
  department    VARCHAR(100),
  created_at    TIMESTAMPTZ  DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS team_members (
  manager_id  VARCHAR(20) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  employee_id VARCHAR(20) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  PRIMARY KEY (manager_id, employee_id)
);

CREATE TABLE IF NOT EXISTS leave_balances (
  id         SERIAL      PRIMARY KEY,
  user_id    VARCHAR(20) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  leave_type VARCHAR(20) NOT NULL CHECK (leave_type IN ('Casual', 'Sick', 'Privilege')),
  allocated  INTEGER     NOT NULL DEFAULT 0 CHECK (allocated >= 0),
  used       INTEGER     NOT NULL DEFAULT 0 CHECK (used >= 0),
  UNIQUE (user_id, leave_type)
);

CREATE TABLE IF NOT EXISTS leave_requests (
  id               UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id          VARCHAR(20) NOT NULL REFERENCES users(id),
  user_name        VARCHAR(100) NOT NULL,
  manager_id       VARCHAR(20) REFERENCES users(id),
  leave_type       VARCHAR(20) NOT NULL CHECK (leave_type IN ('Casual', 'Sick', 'Privilege')),
  start_date       DATE        NOT NULL,
  end_date         DATE        NOT NULL,
  number_of_days   INTEGER     NOT NULL CHECK (number_of_days > 0),
  reason           TEXT        NOT NULL,
  status           VARCHAR(20) NOT NULL DEFAULT 'Pending'
                               CHECK (status IN ('Pending', 'Approved', 'Rejected', 'Cancelled')),
  rejection_reason TEXT,
  applied_at       TIMESTAMPTZ DEFAULT NOW(),
  updated_at       TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT valid_date_range CHECK (end_date >= start_date)
);

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_leave_requests_updated_at
  BEFORE UPDATE ON leave_requests
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
