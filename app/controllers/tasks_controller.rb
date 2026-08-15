class TasksController < ApplicationController
  before_action :require_login
  before_action :set_task, only: %i[show edit update destroy]

  def index
    today = Time.current.in_time_zone("Tokyo").to_date
    tokyo_day = today.in_time_zone("Tokyo").all_day  # JSTの0:00〜23:59（UTC日界とのズレ防止）

    @not_done_tasks = current_user.tasks
      .where(done: false)
      .where("date IS NULL OR date = ?", today)

    @done_tasks = current_user.tasks
      .where(done: true)
      .where(completed_at: tokyo_day)

    @has_any_tasks = current_user.tasks.exists?
    @today_done_count = @done_tasks.count
    @total_count = current_user.completed_count

    @done_dates = current_user.tasks
      .where(done: true)
      .where.not(completed_at: nil)
      .pluck(:completed_at)
      .map { |t| t.in_time_zone("Tokyo").to_date }
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
      .where(completed_at: tokyo_day)
      .sum(:coin_reward)

    @week_done_days = @week_days.count { |d| d[:done] }

    # ===== カレンダー（今週の記録の後継） =====
    @cal_month = begin
      Date.strptime(params[:cal].to_s, "%Y-%m").beginning_of_month
    rescue ArgumentError
      today.beginning_of_month
    end

    completed_by_day = current_user.tasks
      .where(done: true).where.not(completed_at: nil)
      .pluck(:completed_at)
      .map { |t| t.in_time_zone("Tokyo").to_date }
      .tally
    planned_by_day = current_user.tasks.where.not(date: nil).group(:date).count

    @cal_status = {}
    (@cal_month..@cal_month.end_of_month).each do |d|
      done_n = completed_by_day[d].to_i
      plan_n = planned_by_day[d].to_i
      @cal_status[d] =
        if done_n.positive? && plan_n > done_n then :part
        elsif done_n.positive?                 then :done
        elsif plan_n.positive? && d < today    then :miss
        end
    end
  end

  def list
    @not_done = current_user.tasks.where(done: false).order(created_at: :desc)
    @done_tasks = current_user.tasks.where(done: true).order(completed_at: :desc)
    @total = @not_done.count + @done_tasks.count
  end

  def show
  end

  def new
    @task = current_user.tasks.build
  end

  def edit
  end

  def create
    @task = current_user.tasks.build(task_params)
    if @task.save
      redirect_to tasks_path, notice: "✨えらい💖"
    else
      render :new
    end
  end

  def update
    evolved = false

    ActiveRecord::Base.transaction do
      @task.update!(task_params)

      if @task.saved_change_to_done? && @task.done?
        before_stage = current_user.ribbon_stage
        current_user.increment!(:completed_count)
        current_user.increment!(:coins, @task.coin_reward)
        @task.update!(completed_at: Time.current)

        after_stage = current_user.ribbon_stage
        if after_stage > before_stage
          flash[:evolution_stage]      = after_stage.to_s
          flash[:evolution_first_time] = "true"
          evolved = true
        end
      end

      if @task.saved_change_to_done? && !@task.done?
        current_user.decrement!(:completed_count) if current_user.completed_count > 0
        current_user.decrement!(:coins, @task.coin_reward) if current_user.coins >= @task.coin_reward
        @task.update!(completed_at: nil)
      end
    end

    # 進化した時だけ従来どおりフルページ遷移＝既存の進化演出(3.2秒)をそのまま出す。
    # 通常の完了/取消は turbo_stream で該当領域だけ差し替え、ページを再読込しない。
    if evolved
      redirect_back fallback_location: tasks_path, notice: "🎉 えらい！がんばり達成！ #{current_user.badge}"
    else
      respond_to do |format|
        format.turbo_stream
        format.html { redirect_back fallback_location: tasks_path, notice: "🎉 えらい！がんばり達成！ #{current_user.badge}" }
      end
    end
  rescue ActiveRecord::RecordInvalid
    render :edit, status: :unprocessable_entity
  end

  def destroy
    @task.destroy
    redirect_back fallback_location: tasks_path, notice: "削除したよ"
  end

  private

  def set_task
    @task = current_user.tasks.find(params[:id])
  end

  def task_params
    params.require(:task).permit(:title, :done, :priority, :date, :category)
  end
end
