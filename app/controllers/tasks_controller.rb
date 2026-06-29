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
  # 日付が変わったら前日以前に完了したタスクを未完了に戻す
  current_user.tasks
    .where(done: true)
    .where("completed_at < ?", Date.current.beginning_of_day)
    .update_all(done: false, completed_at: nil)

  @not_done_tasks = current_user.tasks.where(done: false)
  @done_tasks     = current_user.tasks.where(done: true)
  @has_any_tasks  = current_user.tasks.exists?

  @today_done_count = current_user.tasks
    .where(done: true)
    .where(completed_at: Time.current.all_day)
    .count

  @total_count = current_user.completed_count

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

  @week_days = (6.days.ago.to_date..Date.current).map do |d|
    { date: d, done: @done_dates.include?(d), today: d == Date.current }
  end

  @today_coins = current_user.tasks
    .where(done: true)
    .where(completed_at: Time.current.all_day)
    .sum(:coin_reward)

  @week_done_days = @week_days.count { |d| d[:done] }
end

  # =====================
  # タスク一覧ページ（サイドメニュー「タスク」）
  # =====================
  def list
    current_user.tasks
      .where(done: true)
      .where("completed_at < ?", Date.current.beginning_of_day)
      .update_all(done: false, completed_at: nil)

    @not_done = current_user.tasks.where(done: false).order(created_at: :desc)
    @done_tasks = current_user.tasks.where(done: true).order(completed_at: :desc)
    @total = @not_done.count + @done_tasks.count
  end

  # =====================
  # 詳細ページ
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

    if @task.saved_change_to_done? && @task.done?
      before_stage = current_user.ribbon_stage
      current_user.increment!(:completed_count)
      current_user.increment!(:coins, @task.coin_reward)
      @task.update(completed_at: Time.current)

      after_stage = current_user.ribbon_stage
      if after_stage > before_stage
        session[:seen_evolutions] ||= []
        is_first = !session[:seen_evolutions].include?(after_stage)
        session[:seen_evolutions] << after_stage
        flash[:evolution_stage]      = after_stage.to_s
        flash[:evolution_first_time] = is_first.to_s
      end
    end

    if @task.saved_change_to_done? && !@task.done?
      current_user.decrement!(:completed_count) if current_user.completed_count > 0
      current_user.decrement!(:coins, @task.coin_reward) if current_user.coins >= @task.coin_reward
      @task.update(completed_at: nil)
    end

    redirect_to tasks_path, notice: "🎉 えらい！がんばり達成！ #{current_user.badge}"
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
    params.require(:task).permit(:title, :done, :priority, :date, :category)
  end
end