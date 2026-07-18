# ── Build stage: asset precompile only ──────────────────────────────
FROM ruby:3.1.4 AS builder

RUN apt-get update -qq && apt-get install -y libpq-dev

WORKDIR /app
COPY Gemfile Gemfile.lock ./
RUN bundle install

COPY . .

ENV RAILS_ENV=production
ARG SECRET_KEY_BASE=dummy
RUN bundle exec rails assets:precompile

# ── Runtime stage: no dummy secret in final image ────────────────────
FROM ruby:3.1.4

RUN apt-get update -qq && apt-get install -y libpq-dev

WORKDIR /app
COPY --from=builder /usr/local/bundle /usr/local/bundle
COPY --from=builder /app/public/assets /app/public/assets

COPY . .

ENV RAILS_ENV=production
ENV RAILS_SERVE_STATIC_FILES=enabled
ENV RAILS_LOG_TO_STDOUT=enabled

EXPOSE 3000
COPY entrypoint.sh /entrypoint.sh
RUN chmod +x /entrypoint.sh
ENTRYPOINT ["/entrypoint.sh"]
CMD ["bundle", "exec", "rails", "server", "-b", "0.0.0.0", "-p", "3000"]
