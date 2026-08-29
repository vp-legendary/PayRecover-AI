import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts"

function RecoveryChart({ payments }) {

  const chartData = payments.reduce((result, payment) => {

    const existingDay = result.find(
      (item) => item.date === payment.date
    )

    if (existingDay) {

      existingDay.total += 1

      if (payment.status === "Recovered") {
        existingDay.recovered += 1
      }

      existingDay.recovery = (
        (existingDay.recovered / existingDay.total) * 100
      ).toFixed(1)

    } else {

      result.push({
        date: payment.date,
        total: 1,
        recovered: payment.status === "Recovered" ? 1 : 0,
        recovery:
          payment.status === "Recovered"
            ? "100.0"
            : "0.0",
      })

    }

    return result

  }, [])

  return (
    <div className="chart-card">

      <div className="chart-header">

        <h2>Recovery Analytics</h2>

        <p>
          Payment recovery rate based on actual transactions
        </p>

      </div>

      <div className="chart-container">

        <ResponsiveContainer width="100%" height="100%">

          <LineChart
            data={chartData}
            margin={{
              top: 10,
              right: 20,
              left: 0,
              bottom: 10,
            }}
          >

            <CartesianGrid strokeDasharray="3 3" />

            <XAxis dataKey="date" />

            <YAxis
              domain={[0, 100]}
              tickFormatter={(value) => `${value}%`}
            />

            <Tooltip
              formatter={(value) => [`${value}%`, "Recovery Rate"]}
            />

            <Line
              type="monotone"
              dataKey="recovery"
              stroke="#4f46e5"
              strokeWidth={3}
              dot={{ r: 5 }}
              activeDot={{ r: 7 }}
            />

          </LineChart>

        </ResponsiveContainer>

      </div>

    </div>
  )
}

export default RecoveryChart