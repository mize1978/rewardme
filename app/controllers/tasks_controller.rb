class TasksController < ApplicationController
    before_action :require_login
    before_action :set_task, only: %i[show edit update destroy]

  # =====================
  # 共通処理（同じ処理をまとめられる！）
  # =====================
  # show / edit / update / destroy の前に対象のタスクを取得

# =====================
# 一覧表示
# =====================
def index
  @not_done_tasks = current_user.tasks.where(done: false)
  @done_tasks = current_user.tasks.where(done: true)

  @today_done_count = current_user.tasks
    .where(done: true)
    .where(completed_at: Time.current.all_day)
    .count

  # 🔥 ここ追加
  @done_dates = current_user.tasks
    .where(done: true)
    .where.not(completed_at: nil)
    .pluck(:completed_at)
    .map(&:to_date)
    .uniq

  streak = 0
  date = Date.current

  while @done_dates.include?(date)
    streak += 1
    date -= 1.day
  end

  @streak_days = streak
end

  # =====================
  # 詳細ページ（今回は未使用かな）
  # =====================
  def show
  end

  # =====================
  # 新規作成ページ
  # =====================
  def new
    # 空のタスクを作る（フォーム用）
     @task = current_user.tasks.build
  end

  # =====================
  # 編集ページ
  # =====================
  def edit
  end

  # =====================
  # タスク作成処理
  # =====================
  def create
    # フォームから送られた値でタスクを作る
    @task = current_user.tasks.build(task_params)

    if @task.save
      # 保存成功 → 一覧へ＋メッセージ
      redirect_to tasks_path, notice: "✨えらい💖"
    else
      # 失敗 → 入力画面に戻る
      render :new
    end
  end

# =====================
# タスク更新処理
# =====================
def update
  if @task.update(task_params)

    # 完了にした時だけ completed_at を入れる
    if @task.done? && @task.completed_at.blank?
      @task.update(completed_at: Time.current)
    end

    # 未完了に戻した時は completed_at を消す
    unless @task.done?
      @task.update(completed_at: nil)
    end

    redirect_to tasks_path, notice: "更新したよ"
  else
    render :edit, status: :unprocessable_entity
  end
end

  # =====================
  # タスク削除
  # =====================
  def destroy
    @task.destroy

    # 削除後一覧へ
    redirect_to tasks_path, notice: "削除したよ"
  end

  private

  # =====================
  # 対象タスク取得
  # =====================
  def set_task
    # URLのidからタスクを取得する
    @task = current_user.tasks.find(params[:id])
  end

  # =====================
  # 許可するパラメータ
  # =====================
  def task_params
    params.require(:task).permit(:title, :done, :priority, :date)
  end
end