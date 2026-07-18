require "test_helper"

class TaskCompletionTest < ActionDispatch::IntegrationTest
  setup do
    @user = users(:one)
    @task = tasks(:one)
    post login_path, params: { email: "test@example.com", password: "password" }
  end

  test "タスク完了で completed_count が1増える" do
    assert_difference -> { @user.reload.completed_count }, 1 do
      patch task_path(@task), params: { task: { done: "1" } }
    end
  end

  test "タスク完了でコインが増える" do
    assert_difference -> { @user.reload.coins }, @task.coin_reward do
      patch task_path(@task), params: { task: { done: "1" } }
    end
  end

  test "タスクを未完了に戻すと completed_count が1減る" do
    patch task_path(@task), params: { task: { done: "1" } }

    assert_difference -> { @user.reload.completed_count }, -1 do
      patch task_path(@task), params: { task: { done: "0" } }
    end
  end
end
